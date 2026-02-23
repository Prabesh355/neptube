import { z } from "zod";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { comments, users, videos, notifications } from "@/db/schema";
import { analyzeSentiment, detectSpam, detectEmotion, generateReplySuggestions, filterToxicComment } from "@/lib/ai";
import { rateLimit, COMMENT_RATE_LIMIT } from "@/lib/rate-limit";
import { TRPCError } from "@trpc/server";
import { notifyAdmins } from "@/lib/admin-notify";

export const commentsRouter = createTRPCRouter({
  // Get comments for a video
  getByVideo: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const videoComments = await ctx.db
        .select({
          id: comments.id,
          content: comments.content,
          likeCount: comments.likeCount,
          createdAt: comments.createdAt,
          parentId: comments.parentId,
          // ML fields
          sentiment: comments.sentiment,
          sentimentScore: comments.sentimentScore,
          isToxic: comments.isToxic,
          isSpam: comments.isSpam,
          emotion: comments.emotion,
          emotionConfidence: comments.emotionConfidence,
          isHidden: comments.isHidden,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(
          and(
            eq(comments.videoId, input.videoId),
            isNull(comments.parentId),
            eq(comments.isHidden, false)
          )
        )
        .orderBy(desc(comments.createdAt))
        .limit(input.limit);

      return videoComments;
    }),

  // Get replies for a comment
  getReplies: baseProcedure
    .input(
      z.object({
        parentId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const replies = await ctx.db
        .select({
          id: comments.id,
          content: comments.content,
          likeCount: comments.likeCount,
          createdAt: comments.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.parentId, input.parentId))
        .orderBy(desc(comments.createdAt))
        .limit(input.limit);

      return replies;
    }),

  // Create comment
  create: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        content: z.string().min(1).max(2000),
        parentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Rate limit check
      const rl = rateLimit(ctx.user.id, "comment", COMMENT_RATE_LIMIT);
      if (!rl.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many comments. Try again in ${rl.resetInSeconds}s.`,
        });
      }

      // ── Toxic comment filter (blocks before DB write) ──
      const filter = await filterToxicComment(input.content);
      if (filter.blocked) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: filter.reason!,
        });
      }

      // Run enrichment analysis in parallel (sentiment, spam, emotion)
      const [sentimentResult, spamResult, emotionResult] = await Promise.all([
        analyzeSentiment(input.content),
        detectSpam(input.content),
        detectEmotion(input.content),
      ]);

      const newComment = await ctx.db
        .insert(comments)
        .values({
          content: input.content,
          videoId: input.videoId,
          userId: ctx.user.id,
          parentId: input.parentId,
          // Toxicity fields from filterToxicComment
          isToxic: filter.isToxic,
          toxicityScore: filter.toxicityScore,
          // Enrichment fields
          sentiment: sentimentResult.sentiment,
          sentimentScore: sentimentResult.score,
          isSpam: spamResult.isSpam,
          spamScore: spamResult.score,
          emotion: emotionResult.emotion,
          emotionConfidence: emotionResult.confidence,
          isHidden: false,
        })
        .returning();

      // Increment comment count on video
      await ctx.db
        .update(videos)
        .set({ commentCount: sql`${videos.commentCount} + 1` })
        .where(eq(videos.id, input.videoId));

      // Send notification to video owner (fire-and-forget)
      (async () => {
        try {
          const video = await ctx.db
            .select({ userId: videos.userId, title: videos.title })
            .from(videos)
            .where(eq(videos.id, input.videoId))
            .limit(1);

          if (video[0] && video[0].userId !== ctx.user.id) {
            if (input.parentId) {
              // Reply notification - notify the parent comment author
              const parentComment = await ctx.db
                .select({ userId: comments.userId })
                .from(comments)
                .where(eq(comments.id, input.parentId))
                .limit(1);

              if (parentComment[0] && parentComment[0].userId !== ctx.user.id) {
                await ctx.db.insert(notifications).values({
                  userId: parentComment[0].userId,
                  type: "reply",
                  title: "New reply",
                  message: `${ctx.user.name} replied to your comment`,
                  link: `/feed/${input.videoId}`,
                  fromUserId: ctx.user.id,
                  videoId: input.videoId,
                });
              }
            } else {
              // Comment notification to video owner
              await ctx.db.insert(notifications).values({
                userId: video[0].userId,
                type: "comment",
                title: "New comment",
                message: `${ctx.user.name} commented on "${video[0].title}"`,
                link: `/feed/${input.videoId}`,
                fromUserId: ctx.user.id,
                videoId: input.videoId,
              });
            }
          }
        } catch (err) {
          console.error("Failed to send comment notification:", err);
        }
      })();

      // Notify admins about new comment (higher priority for toxic/spam)
      (async () => {
        try {
          const isSuspicious = filter.isToxic || spamResult.isSpam;
          await notifyAdmins(ctx.db, {
            type: isSuspicious ? (filter.isToxic ? "toxic_comment" : "spam_detected") : "new_comment",
            priority: isSuspicious ? "high" : "low",
            title: isSuspicious ? (filter.isToxic ? "Toxic comment detected" : "Spam comment detected") : "New comment posted",
            message: `${ctx.user.name}: "${input.content.slice(0, 100)}${input.content.length > 100 ? "..." : ""}"`,
            link: `/admin/comments${filter.isToxic ? "/toxic" : ""}`,
            actorId: ctx.user.id,
            targetType: "comment",
            targetId: newComment[0].id,
            metadata: { videoId: input.videoId, isToxic: filter.isToxic, isSpam: spamResult.isSpam, toxicityScore: filter.toxicityScore },
          });
        } catch (err) {
          console.error("Failed to send admin notification for comment:", err);
        }
      })();

      return newComment[0];
    }),

  // Update comment (re-runs filterToxicComment on edited content)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        content: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // ── Toxic comment filter (blocks before DB write) ──
      const filter = await filterToxicComment(input.content);
      if (filter.blocked) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: filter.reason!,
        });
      }

      const updated = await ctx.db
        .update(comments)
        .set({
          content: input.content,
          isToxic: filter.isToxic,
          toxicityScore: filter.toxicityScore,
          isHidden: false,
          updatedAt: new Date(),
        })
        .where(and(eq(comments.id, input.id), eq(comments.userId, ctx.user.id)))
        .returning();

      return updated[0];
    }),

  // Delete comment
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(comments)
        .where(and(eq(comments.id, input.id), eq(comments.userId, ctx.user.id)));

      return { success: true };
    }),

  // Like comment
  like: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(comments)
        .set({
          likeCount: sql`${comments.likeCount} + 1`,
        })
        .where(eq(comments.id, input.id));

      return { success: true };
    }),

  // Get AI reply suggestions for a comment
  getReplySuggestions: protectedProcedure
    .input(
      z.object({
        commentId: z.string().uuid(),
        videoId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const comment = await ctx.db
        .select({ content: comments.content })
        .from(comments)
        .where(eq(comments.id, input.commentId))
        .limit(1);

      const video = await ctx.db
        .select({ title: videos.title })
        .from(videos)
        .where(eq(videos.id, input.videoId))
        .limit(1);

      if (!comment[0] || !video[0]) {
        return { suggestions: [] };
      }

      const suggestions = await generateReplySuggestions(
        comment[0].content,
        video[0].title
      );

      return { suggestions };
    }),
});
