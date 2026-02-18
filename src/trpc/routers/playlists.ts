import { z } from "zod";
import { eq, desc, and, sql, asc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "../init";
import { playlists, playlistVideos, videos, users } from "@/db/schema";

export const playlistsRouter = createTRPCRouter({
  // Get or create Watch Later playlist
  getOrCreateWatchLater: protectedProcedure.mutation(async ({ ctx }) => {
    // Look for existing Watch Later playlist
    const existing = await ctx.db
      .select()
      .from(playlists)
      .where(and(eq(playlists.userId, ctx.user.id), eq(playlists.name, "Watch Later")))
      .limit(1);

    if (existing[0]) return existing[0];

    const newPlaylist = await ctx.db
      .insert(playlists)
      .values({
        name: "Watch Later",
        description: "Videos you want to watch later",
        visibility: "private",
        userId: ctx.user.id,
      })
      .returning();

    return newPlaylist[0];
  }),

  // Add to Watch Later (convenience method)
  addToWatchLater: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Find or create Watch Later playlist
      let watchLater = await ctx.db
        .select()
        .from(playlists)
        .where(and(eq(playlists.userId, ctx.user.id), eq(playlists.name, "Watch Later")))
        .limit(1);

      if (!watchLater[0]) {
        watchLater = await ctx.db
          .insert(playlists)
          .values({
            name: "Watch Later",
            description: "Videos you want to watch later",
            visibility: "private",
            userId: ctx.user.id,
          })
          .returning();
      }

      const playlistId = watchLater[0].id;

      // Check if already in playlist
      const existing = await ctx.db
        .select()
        .from(playlistVideos)
        .where(and(eq(playlistVideos.playlistId, playlistId), eq(playlistVideos.videoId, input.videoId)))
        .limit(1);

      if (existing[0]) {
        // Remove from Watch Later (toggle)
        await ctx.db.delete(playlistVideos).where(eq(playlistVideos.id, existing[0].id));
        return { added: false, playlistId };
      }

      // Get max position
      const maxPos = await ctx.db
        .select({ max: sql<number>`coalesce(max(position), -1)` })
        .from(playlistVideos)
        .where(eq(playlistVideos.playlistId, playlistId));

      await ctx.db.insert(playlistVideos).values({
        playlistId,
        videoId: input.videoId,
        position: (maxPos[0]?.max ?? -1) + 1,
      });

      return { added: true, playlistId };
    }),

  // Check if video is in Watch Later
  isInWatchLater: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const watchLater = await ctx.db
        .select()
        .from(playlists)
        .where(and(eq(playlists.userId, ctx.user.id), eq(playlists.name, "Watch Later")))
        .limit(1);

      if (!watchLater[0]) return false;

      const existing = await ctx.db
        .select()
        .from(playlistVideos)
        .where(and(eq(playlistVideos.playlistId, watchLater[0].id), eq(playlistVideos.videoId, input.videoId)))
        .limit(1);

      return !!existing[0];
    }),

  // Get my playlists
  getMyPlaylists: protectedProcedure.query(async ({ ctx }) => {
    const myPlaylists = await ctx.db
      .select({
        id: playlists.id,
        name: playlists.name,
        description: playlists.description,
        visibility: playlists.visibility,
        createdAt: playlists.createdAt,
        videoCount: sql<number>`(
          SELECT count(*) FROM playlist_videos
          WHERE playlist_videos.playlist_id = ${playlists.id}
        )`,
      })
      .from(playlists)
      .where(eq(playlists.userId, ctx.user.id))
      .orderBy(desc(playlists.updatedAt));

    return myPlaylists;
  }),

  // Get playlist by ID with videos
  getById: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const playlist = await ctx.db
        .select()
        .from(playlists)
        .where(eq(playlists.id, input.id))
        .limit(1);

      if (!playlist[0]) return null;

      const playlistVids = await ctx.db
        .select({
          id: playlistVideos.id,
          position: playlistVideos.position,
          addedAt: playlistVideos.addedAt,
          video: {
            id: videos.id,
            title: videos.title,
            thumbnailURL: videos.thumbnailURL,
            duration: videos.duration,
            viewCount: videos.viewCount,
            createdAt: videos.createdAt,
          },
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(playlistVideos)
        .innerJoin(videos, eq(playlistVideos.videoId, videos.id))
        .innerJoin(users, eq(videos.userId, users.id))
        .where(eq(playlistVideos.playlistId, input.id))
        .orderBy(asc(playlistVideos.position));

      return {
        ...playlist[0],
        videos: playlistVids,
      };
    }),

  // Create playlist
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        visibility: z.enum(["public", "private", "unlisted"]).default("private"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const newPlaylist = await ctx.db
        .insert(playlists)
        .values({
          ...input,
          userId: ctx.user.id,
        })
        .returning();

      return newPlaylist[0];
    }),

  // Update playlist
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        visibility: z.enum(["public", "private", "unlisted"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const updated = await ctx.db
        .update(playlists)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(playlists.id, id), eq(playlists.userId, ctx.user.id)))
        .returning();

      return updated[0];
    }),

  // Delete playlist
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(playlists)
        .where(
          and(eq(playlists.id, input.id), eq(playlists.userId, ctx.user.id))
        );
      return { success: true };
    }),

  // Add video to playlist
  addVideo: protectedProcedure
    .input(
      z.object({
        playlistId: z.string().uuid(),
        videoId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const playlist = await ctx.db
        .select()
        .from(playlists)
        .where(
          and(
            eq(playlists.id, input.playlistId),
            eq(playlists.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!playlist[0]) throw new Error("Playlist not found");

      // Get max position
      const maxPos = await ctx.db
        .select({ max: sql<number>`coalesce(max(position), -1)` })
        .from(playlistVideos)
        .where(eq(playlistVideos.playlistId, input.playlistId));

      await ctx.db.insert(playlistVideos).values({
        playlistId: input.playlistId,
        videoId: input.videoId,
        position: (maxPos[0]?.max ?? -1) + 1,
      });

      await ctx.db
        .update(playlists)
        .set({ updatedAt: new Date() })
        .where(eq(playlists.id, input.playlistId));

      return { success: true };
    }),

  // Remove video from playlist
  removeVideo: protectedProcedure
    .input(
      z.object({
        playlistId: z.string().uuid(),
        videoId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(playlistVideos)
        .where(
          and(
            eq(playlistVideos.playlistId, input.playlistId),
            eq(playlistVideos.videoId, input.videoId)
          )
        );

      return { success: true };
    }),

  // Get user's liked videos (special "playlist")
  getLikedVideos: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { videoLikes } = await import("@/db/schema");
      const liked = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          thumbnailURL: videos.thumbnailURL,
          duration: videos.duration,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
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
          and(eq(videoLikes.userId, ctx.user.id), eq(videoLikes.isLike, true))
        )
        .orderBy(desc(videoLikes.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return liked;
    }),
});
