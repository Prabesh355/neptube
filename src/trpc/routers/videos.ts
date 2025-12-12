import { z } from "zod";
import { eq, desc, and, sql, ilike, or, ne } from "drizzle-orm";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { videos, users, videoLikes, watchHistory } from "@/db/schema";

export const videosRouter = createTRPCRouter({
  // Get all public videos (feed) with optional search and recommendation algorithm
  getFeed: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
        search: z.string().optional(),
        excludeUserId: z.string().uuid().optional(), // Exclude current user's videos
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(videos.visibility, "public"), eq(videos.approved, true)];
      
      // Exclude current user's own videos from recommendations (like YouTube)
      if (input.excludeUserId) {
        conditions.push(ne(videos.userId, input.excludeUserId));
      }
      
      // Add search conditions if search query provided
      if (input.search && input.search.trim()) {
        const searchTerm = `%${input.search.trim()}%`;
        conditions.push(
          or(
            ilike(videos.title, searchTerm),
            ilike(videos.description, searchTerm),
            ilike(users.name, searchTerm)
          )!
        );
      }

      // Recommendation Algorithm Score:
      // Score = (viewCount * 1) + (likeCount * 5) - (dislikeCount * 3) + recencyBoost
      // Recency boost: Videos less than 7 days old get +100, less than 30 days get +50
      const recencyBoostSql = sql`
        CASE 
          WHEN ${videos.createdAt} > NOW() - INTERVAL '7 days' THEN 100
          WHEN ${videos.createdAt} > NOW() - INTERVAL '30 days' THEN 50
          ELSE 0
        END
      `;
      
      const recommendationScore = sql`
        (COALESCE(${videos.viewCount}, 0) * 1) + 
        (COALESCE(${videos.likeCount}, 0) * 5) - 
        (COALESCE(${videos.dislikeCount}, 0) * 3) + 
        ${recencyBoostSql}
      `.as("recommendation_score");

      const items = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
          recommendationScore: recommendationScore,
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(and(...conditions))
        .orderBy(sql`${recommendationScore} DESC`, desc(videos.createdAt))
        .limit(input.limit + 1);

      let nextCursor: string | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Get video by ID
  getById: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          category: videos.category,
          thumbnailURL: videos.thumbnailURL,
          videoURL: videos.videoURL,
          visibility: videos.visibility,
          duration: videos.duration,
          viewCount: videos.viewCount,
          likeCount: videos.likeCount,
          dislikeCount: videos.dislikeCount,
          createdAt: videos.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(eq(videos.id, input.id))
        .limit(1);

      return video[0] || null;
    }),

  // Get videos by user (channel)
  getByUser: baseProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userVideos = await ctx.db
        .select()
        .from(videos)
        .where(
          and(eq(videos.userId, input.userId), eq(videos.visibility, "public"))
        )
        .orderBy(desc(videos.createdAt))
        .limit(input.limit);

      return userVideos;
    }),

  // Get current user's videos (including private)
  getMyVideos: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const myVideos = await ctx.db
        .select()
        .from(videos)
        .where(eq(videos.userId, ctx.user.id))
        .orderBy(desc(videos.createdAt))
        .limit(input.limit);

      return myVideos;
    }),

  // Create video
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        description: z.string().max(5000).optional(),
        category: z.string().max(50).optional(),
        thumbnailURL: z.string().url().optional(),
        videoURL: z.string().url().optional(),
        qualities: z.string().optional(),
        visibility: z.enum(["public", "private", "unlisted"]).default("public"),
        duration: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const newVideo = await ctx.db
        .insert(videos)
        .values({
          ...input,
          userId: ctx.user.id,
          status: "pending", // Require admin approval
          approved: false,
        })
        .returning();

      return newVideo[0];
    }),

  // Update video
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(100).optional(),
        description: z.string().max(5000).optional(),
        category: z.string().max(50).optional(),
        thumbnailURL: z.string().url().optional(),
        videoURL: z.string().url().optional(),
        visibility: z.enum(["public", "private", "unlisted"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updated = await ctx.db
        .update(videos)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(eq(videos.id, id), eq(videos.userId, ctx.user.id)))
        .returning();

      return updated[0];
    }),

  // Delete video
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(videos)
        .where(and(eq(videos.id, input.id), eq(videos.userId, ctx.user.id)));

      return { success: true };
    }),

  // Check if user has viewed a video (for view count tracking)
  hasViewedVideo: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const viewed = await ctx.db
        .select({ id: watchHistory.id })
        .from(watchHistory)
        .where(
          and(
            eq(watchHistory.videoId, input.videoId),
            eq(watchHistory.userId, ctx.user.id)
          )
        )
        .limit(1);

      return { hasViewed: viewed.length > 0 };
    }),

  // Increment view count (only once per user per video)
  incrementViews: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has already viewed this video
      const viewed = await ctx.db
        .select({ id: watchHistory.id })
        .from(watchHistory)
        .where(
          and(
            eq(watchHistory.videoId, input.id),
            eq(watchHistory.userId, ctx.user.id)
          )
        )
        .limit(1);

      // Only increment if this is the user's first view
      if (viewed.length === 0) {
        await ctx.db
          .update(videos)
          .set({
            viewCount: sql`${videos.viewCount} + 1`,
          })
          .where(eq(videos.id, input.id));

        return { incremented: true };
      }

      return { incremented: false };
    }),

  // Like or dislike video
  toggleLike: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        isLike: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already liked/disliked
      const existing = await ctx.db
        .select()
        .from(videoLikes)
        .where(
          and(
            eq(videoLikes.videoId, input.videoId),
            eq(videoLikes.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing[0]) {
        if (existing[0].isLike === input.isLike) {
          // Remove like/dislike
          await ctx.db
            .delete(videoLikes)
            .where(eq(videoLikes.id, existing[0].id));

          // Update video counts
          await ctx.db
            .update(videos)
            .set({
              likeCount: input.isLike
                ? sql`${videos.likeCount} - 1`
                : videos.likeCount,
              dislikeCount: !input.isLike
                ? sql`${videos.dislikeCount} - 1`
                : videos.dislikeCount,
            })
            .where(eq(videos.id, input.videoId));

          return { action: "removed" };
        } else {
          // Switch like/dislike
          await ctx.db
            .update(videoLikes)
            .set({ isLike: input.isLike })
            .where(eq(videoLikes.id, existing[0].id));

          // Update video counts
          await ctx.db
            .update(videos)
            .set({
              likeCount: input.isLike
                ? sql`${videos.likeCount} + 1`
                : sql`${videos.likeCount} - 1`,
              dislikeCount: input.isLike
                ? sql`${videos.dislikeCount} - 1`
                : sql`${videos.dislikeCount} + 1`,
            })
            .where(eq(videos.id, input.videoId));

          return { action: "switched" };
        }
      } else {
        // Add new like/dislike
        await ctx.db.insert(videoLikes).values({
          videoId: input.videoId,
          userId: ctx.user.id,
          isLike: input.isLike,
        });

        // Update video counts
        await ctx.db
          .update(videos)
          .set({
            likeCount: input.isLike
              ? sql`${videos.likeCount} + 1`
              : videos.likeCount,
            dislikeCount: !input.isLike
              ? sql`${videos.dislikeCount} + 1`
              : videos.dislikeCount,
          })
          .where(eq(videos.id, input.videoId));

        return { action: "added" };
      }
    }),

  // Get user's like status for a video
  getLikeStatus: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const like = await ctx.db
        .select()
        .from(videoLikes)
        .where(
          and(
            eq(videoLikes.videoId, input.videoId),
            eq(videoLikes.userId, ctx.user.id)
          )
        )
        .limit(1);

      return like[0] || null;
    }),

  // Add video to watch history
  addToWatchHistory: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        lastPosition: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already in history
      const existing = await ctx.db
        .select()
        .from(watchHistory)
        .where(
          and(
            eq(watchHistory.videoId, input.videoId),
            eq(watchHistory.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing entry to move it to the top
        await ctx.db
          .update(watchHistory)
          .set({
            watchedAt: new Date(),
            lastPosition: input.lastPosition || 0,
          })
          .where(eq(watchHistory.id, existing[0].id));
      } else {
        // Create new entry
        await ctx.db.insert(watchHistory).values({
          videoId: input.videoId,
          userId: ctx.user.id,
          lastPosition: input.lastPosition || 0,
        });
      }

      return { success: true };
    }),

  // Get user's watch history
  getWatchHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
          watchedAt: watchHistory.watchedAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(watchHistory)
        .innerJoin(videos, eq(watchHistory.videoId, videos.id))
        .innerJoin(users, eq(videos.userId, users.id))
        .where(eq(watchHistory.userId, ctx.user.id))
        .orderBy(desc(watchHistory.watchedAt))
        .limit(input.limit + 1);

      let nextCursor: string | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Get user's liked videos
  getLikedVideos: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
          likedAt: videoLikes.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videoLikes)
        .innerJoin(videos, eq(videoLikes.videoId, videos.id))
        .innerJoin(users, eq(videos.userId, users.id))
        .where(
          and(
            eq(videoLikes.userId, ctx.user.id),
            eq(videoLikes.isLike, true)
          )
        )
        .orderBy(desc(videoLikes.createdAt))
        .limit(input.limit + 1);

      let nextCursor: string | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),
});
