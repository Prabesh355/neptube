import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "../init";
import { communityPosts, pollOptions, pollVotes, communityPostLikes, users, notifications, subscriptions } from "@/db/schema";
import { TRPCError } from "@trpc/server";

export const communityRouter = createTRPCRouter({
  // Get posts for a channel (public)
  getByChannel: baseProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db
        .select({
          id: communityPosts.id,
          type: communityPosts.type,
          content: communityPosts.content,
          imageURL: communityPosts.imageURL,
          likeCount: communityPosts.likeCount,
          commentCount: communityPosts.commentCount,
          createdAt: communityPosts.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(communityPosts)
        .innerJoin(users, eq(communityPosts.userId, users.id))
        .where(eq(communityPosts.userId, input.userId))
        .orderBy(desc(communityPosts.createdAt))
        .limit(input.limit);

      // Fetch poll options for poll-type posts
      const postIds = posts.filter(p => p.type === "poll").map(p => p.id);
      const pollOptionsMap: Record<string, { id: string; text: string; voteCount: number }[]> = {};

      if (postIds.length > 0) {
        for (const postId of postIds) {
          const options = await ctx.db
            .select({
              id: pollOptions.id,
              text: pollOptions.text,
              voteCount: pollOptions.voteCount,
            })
            .from(pollOptions)
            .where(eq(pollOptions.postId, postId));
          pollOptionsMap[postId] = options;
        }
      }

      return posts.map(post => ({
        ...post,
        pollOptions: pollOptionsMap[post.id] || [],
      }));
    }),

  // Get community feed (posts from subscribed channels)
  getFeed: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const subs = await ctx.db
        .select({ channelId: subscriptions.channelId })
        .from(subscriptions)
        .where(eq(subscriptions.subscriberId, ctx.user.id));

      if (subs.length === 0) return [];

      const channelIds = subs.map(s => s.channelId);

      // Get posts from all subscribed channels
      const allPosts = [];
      for (const channelId of channelIds) {
        const posts = await ctx.db
          .select({
            id: communityPosts.id,
            type: communityPosts.type,
            content: communityPosts.content,
            imageURL: communityPosts.imageURL,
            likeCount: communityPosts.likeCount,
            commentCount: communityPosts.commentCount,
            createdAt: communityPosts.createdAt,
            user: {
              id: users.id,
              name: users.name,
              imageURL: users.imageURL,
            },
          })
          .from(communityPosts)
          .innerJoin(users, eq(communityPosts.userId, users.id))
          .where(eq(communityPosts.userId, channelId))
          .orderBy(desc(communityPosts.createdAt))
          .limit(10);
        allPosts.push(...posts);
      }

      // Sort by date and limit
      allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const limited = allPosts.slice(0, input.limit);

      // Fetch poll options
      const pollPostIds = limited.filter(p => p.type === "poll").map(p => p.id);
      const pollOptionsMap: Record<string, { id: string; text: string; voteCount: number }[]> = {};

      for (const postId of pollPostIds) {
        const options = await ctx.db
          .select({ id: pollOptions.id, text: pollOptions.text, voteCount: pollOptions.voteCount })
          .from(pollOptions)
          .where(eq(pollOptions.postId, postId));
        pollOptionsMap[postId] = options;
      }

      return limited.map(post => ({
        ...post,
        pollOptions: pollOptionsMap[post.id] || [],
      }));
    }),

  // Create a community post
  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(3000),
        type: z.enum(["text", "image", "poll"]).default("text"),
        imageURL: z.string().url().optional(),
        pollOptions: z.array(z.string().min(1).max(200)).min(2).max(6).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const newPost = await ctx.db
        .insert(communityPosts)
        .values({
          userId: ctx.user.id,
          type: input.type,
          content: input.content,
          imageURL: input.imageURL,
        })
        .returning();

      const postId = newPost[0].id;

      // Create poll options if type is poll
      if (input.type === "poll" && input.pollOptions) {
        for (const optionText of input.pollOptions) {
          await ctx.db.insert(pollOptions).values({
            postId,
            text: optionText,
          });
        }
      }

      // Notify subscribers
      (async () => {
        try {
          const subs = await ctx.db
            .select({ subscriberId: subscriptions.subscriberId })
            .from(subscriptions)
            .where(eq(subscriptions.channelId, ctx.user.id));

          if (subs.length > 0) {
            await ctx.db.insert(notifications).values(
              subs.map(sub => ({
                userId: sub.subscriberId,
                type: "community_post" as const,
                title: "New community post",
                message: `${ctx.user.name} posted: "${input.content.slice(0, 80)}${input.content.length > 80 ? "..." : ""}"`,
                link: `/community`,
                fromUserId: ctx.user.id,
              }))
            );
          }
        } catch (err) {
          console.error("Failed to send community post notifications:", err);
        }
      })();

      return newPost[0];
    }),

  // Delete a community post
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(communityPosts)
        .where(and(eq(communityPosts.id, input.id), eq(communityPosts.userId, ctx.user.id)));
      return { success: true };
    }),

  // Toggle like on a post
  toggleLike: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(communityPostLikes)
        .where(and(eq(communityPostLikes.postId, input.postId), eq(communityPostLikes.userId, ctx.user.id)))
        .limit(1);

      if (existing[0]) {
        await ctx.db.delete(communityPostLikes).where(eq(communityPostLikes.id, existing[0].id));
        await ctx.db
          .update(communityPosts)
          .set({ likeCount: sql`${communityPosts.likeCount} - 1` })
          .where(eq(communityPosts.id, input.postId));
        return { liked: false };
      } else {
        await ctx.db.insert(communityPostLikes).values({ userId: ctx.user.id, postId: input.postId });
        await ctx.db
          .update(communityPosts)
          .set({ likeCount: sql`${communityPosts.likeCount} + 1` })
          .where(eq(communityPosts.id, input.postId));
        return { liked: true };
      }
    }),

  // Vote on a poll
  vote: protectedProcedure
    .input(z.object({ postId: z.string().uuid(), optionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if already voted
      const existing = await ctx.db
        .select()
        .from(pollVotes)
        .where(and(eq(pollVotes.postId, input.postId), eq(pollVotes.userId, ctx.user.id)))
        .limit(1);

      if (existing[0]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have already voted on this poll" });
      }

      await ctx.db.insert(pollVotes).values({
        userId: ctx.user.id,
        optionId: input.optionId,
        postId: input.postId,
      });

      await ctx.db
        .update(pollOptions)
        .set({ voteCount: sql`${pollOptions.voteCount} + 1` })
        .where(eq(pollOptions.id, input.optionId));

      return { success: true };
    }),

  // Check if user has voted on a poll
  hasVoted: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const vote = await ctx.db
        .select({ optionId: pollVotes.optionId })
        .from(pollVotes)
        .where(and(eq(pollVotes.postId, input.postId), eq(pollVotes.userId, ctx.user.id)))
        .limit(1);

      return vote[0] || null;
    }),
});
