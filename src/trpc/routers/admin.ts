import { z } from "zod";
import { eq, desc, sql, and, like, or, gte } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "../init";
import { users, videos, comments, reports, adminNotifications } from "@/db/schema";

export const adminRouter = createTRPCRouter({
  // Get dashboard statistics
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [userCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [videoCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(videos);

    const [commentCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(comments);

    const [totalViews] = await ctx.db
      .select({ sum: sql<number>`coalesce(sum(${videos.viewCount}), 0)` })
      .from(videos);

    const [bannedUsers] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isBanned, true));

    const [pendingVideos] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(videos)
      .where(eq(videos.status, "pending"));

    const [nsfwVideos] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(videos)
      .where(eq(videos.isNsfw, true));

    const [toxicComments] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.isToxic, true));

    const [hiddenComments] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.isHidden, true));

    return {
      totalUsers: Number(userCount?.count ?? 0),
      totalVideos: Number(videoCount?.count ?? 0),
      totalComments: Number(commentCount?.count ?? 0),
      totalViews: Number(totalViews?.sum ?? 0),
      bannedUsers: Number(bannedUsers?.count ?? 0),
      pendingVideos: Number(pendingVideos?.count ?? 0),
      nsfwVideos: Number(nsfwVideos?.count ?? 0),
      toxicComments: Number(toxicComments?.count ?? 0),
      hiddenComments: Number(hiddenComments?.count ?? 0),
    };
  }),

  // Get all users with pagination
  getUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().default(0),
        search: z.string().optional(),
        role: z.enum(["all", "user", "admin", "moderator"]).default("all"),
        banned: z.enum(["all", "banned", "active"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.search) {
        conditions.push(
          or(
            like(users.name, `%${input.search}%`),
            like(users.clerkId, `%${input.search}%`)
          )
        );
      }

      if (input.role !== "all") {
        conditions.push(eq(users.role, input.role));
      }

      if (input.banned === "banned") {
        conditions.push(eq(users.isBanned, true));
      } else if (input.banned === "active") {
        conditions.push(eq(users.isBanned, false));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const allUsers = await ctx.db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [total] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);

      return {
        users: allUsers,
        total: Number(total?.count ?? 0),
      };
    }),

  // Update user role
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(["user", "admin", "moderator"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(users)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning();

      return updated[0];
    }),

  // Ban user (accepts either UUID or Clerk ID)
  banUser: adminProcedure
    .input(
      z.object({
        userId: z.string(), // Can be UUID or Clerk ID
        reason: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if it's a UUID or Clerk ID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.userId);
      
      const updated = await ctx.db
        .update(users)
        .set({
          isBanned: true,
          banReason: input.reason,
          updatedAt: new Date(),
        })
        .where(isUUID ? eq(users.id, input.userId) : eq(users.clerkId, input.userId))
        .returning();

      return updated[0];
    }),

  // Unban user (accepts either UUID or Clerk ID)
  unbanUser: adminProcedure
    .input(z.object({ userId: z.string() })) // Can be UUID or Clerk ID
    .mutation(async ({ ctx, input }) => {
      // Check if it's a UUID or Clerk ID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.userId);
      
      const updated = await ctx.db
        .update(users)
        .set({
          isBanned: false,
          banReason: null,
          updatedAt: new Date(),
        })
        .where(isUUID ? eq(users.id, input.userId) : eq(users.clerkId, input.userId))
        .returning();

      return updated[0];
    }),

  // Get all videos with pagination
  getVideos: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().default(0),
        status: z.enum(["all", "draft", "pending", "published", "rejected"]).default("all"),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.status !== "all") {
        conditions.push(eq(videos.status, input.status));
      }

      if (input.search) {
        conditions.push(like(videos.title, `%${input.search}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const allVideos = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          status: videos.status,
          visibility: videos.visibility,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(whereClause)
        .orderBy(desc(videos.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [total] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(videos)
        .where(whereClause);

      return {
        videos: allVideos,
        total: Number(total?.count ?? 0),
      };
    }),

  // Update video status (approve/reject)
  updateVideoStatus: adminProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        status: z.enum(["draft", "pending", "published", "rejected"]),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const setFields: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
        rejectionReason: input.rejectionReason,
      };
      const updated = await ctx.db
        .update(videos)
        .set(setFields)
        .where(eq(videos.id, input.videoId))
        .returning();

      return updated[0];
    }),

  // Delete video
  deleteVideo: adminProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(videos).where(eq(videos.id, input.videoId));
      return { success: true };
    }),

  // Delete user (and all their content)
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(users).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Get toxic comments for admin
  getToxicComments: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(100) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: comments.id,
          content: comments.content,
          createdAt: comments.createdAt,
          toxicityScore: comments.toxicityScore,
          user: {
            id: users.id,
            name: users.name,
          },
          video: {
            id: videos.id,
            title: videos.title,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(videos, eq(comments.videoId, videos.id))
        .where(eq(comments.isToxic, true))
        .orderBy(desc(comments.createdAt))
        .limit(input.limit);
      return { comments: rows };
    }),

  // Delete a comment by id
  deleteComment: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(comments).where(eq(comments.id, input.id));
      return { success: true };
    }),

  // Unmark a comment as toxic
  unmarkToxicComment: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(comments)
        .set({ isToxic: false, toxicityScore: 0 })
        .where(eq(comments.id, input.id));
      return { success: true };
    }),

  // Get all comments with pagination
  getAllComments: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().default(0),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.search) {
        conditions.push(like(comments.content, `%${input.search}%`));
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await ctx.db
        .select({
          id: comments.id,
          content: comments.content,
          createdAt: comments.createdAt,
          isToxic: comments.isToxic,
          isHidden: comments.isHidden,
          toxicityScore: comments.toxicityScore,
          user: { id: users.id, name: users.name, imageURL: users.imageURL },
          video: { id: videos.id, title: videos.title },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(videos, eq(comments.videoId, videos.id))
        .where(whereClause)
        .orderBy(desc(comments.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [total] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(whereClause);

      return { comments: rows, total: Number(total?.count ?? 0) };
    }),

  // Get auto-hidden comments
  getHiddenComments: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(100) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: comments.id,
          content: comments.content,
          createdAt: comments.createdAt,
          isToxic: comments.isToxic,
          isHidden: comments.isHidden,
          toxicityScore: comments.toxicityScore,
          user: { id: users.id, name: users.name, imageURL: users.imageURL },
          video: { id: videos.id, title: videos.title },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .innerJoin(videos, eq(comments.videoId, videos.id))
        .where(eq(comments.isHidden, true))
        .orderBy(desc(comments.createdAt))
        .limit(input.limit);
      return { comments: rows };
    }),

  // Unhide a comment
  unhideComment: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(comments)
        .set({ isHidden: false })
        .where(eq(comments.id, input.id));
      return { success: true };
    }),

  // Get banned users
  getBannedUsers: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(users)
        .where(eq(users.isBanned, true))
        .orderBy(desc(users.updatedAt))
        .limit(input.limit);
      return { users: rows };
    }),

  // Get pending videos
  getPendingVideos: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          status: videos.status,
          visibility: videos.visibility,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
          user: { id: users.id, name: users.name, imageURL: users.imageURL },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(eq(videos.status, "pending"))
        .orderBy(desc(videos.createdAt))
        .limit(input.limit);
      return { videos: rows };
    }),

  // Get NSFW flagged videos
  getNsfwVideos: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailURL: videos.thumbnailURL,
          status: videos.status,
          isNsfw: videos.isNsfw,
          viewCount: videos.viewCount,
          createdAt: videos.createdAt,
          user: { id: users.id, name: users.name, imageURL: users.imageURL },
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(eq(videos.isNsfw, true))
        .orderBy(desc(videos.createdAt))
        .limit(input.limit);
      return { videos: rows };
    }),

  // Toggle NSFW flag on a video
  toggleNsfw: adminProcedure
    .input(z.object({ videoId: z.string().uuid(), isNsfw: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(videos)
        .set({ isNsfw: input.isNsfw, updatedAt: new Date() })
        .where(eq(videos.id, input.videoId));
      return { success: true };
    }),

  // Get recent activity timeline (aggregated from existing data)
  getRecentActivity: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        days: z.number().min(1).max(90).default(7),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const days = input?.days ?? 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Fetch recent data in parallel
      const [
        recentBans,
        recentReports,
        recentToxicComments,
        recentPendingVideos,
        recentNsfwVideos,
        recentUsers,
      ] = await Promise.all([
        // Recently banned users
        ctx.db
          .select({
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
            banReason: users.banReason,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(and(eq(users.isBanned, true), gte(users.updatedAt, since)))
          .orderBy(desc(users.updatedAt))
          .limit(limit),

        // Recent reports
        ctx.db
          .select({
            id: reports.id,
            targetType: reports.targetType,
            targetId: reports.targetId,
            reason: reports.reason,
            status: reports.status,
            createdAt: reports.createdAt,
            reporterName: users.name,
          })
          .from(reports)
          .leftJoin(users, eq(reports.reporterId, users.id))
          .where(gte(reports.createdAt, since))
          .orderBy(desc(reports.createdAt))
          .limit(limit),

        // Recent toxic comments
        ctx.db
          .select({
            id: comments.id,
            content: comments.content,
            toxicityScore: comments.toxicityScore,
            createdAt: comments.createdAt,
            userName: users.name,
          })
          .from(comments)
          .leftJoin(users, eq(comments.userId, users.id))
          .where(and(eq(comments.isToxic, true), gte(comments.createdAt, since)))
          .orderBy(desc(comments.createdAt))
          .limit(limit),

        // Recent pending videos
        ctx.db
          .select({
            id: videos.id,
            title: videos.title,
            createdAt: videos.createdAt,
            userName: users.name,
          })
          .from(videos)
          .leftJoin(users, eq(videos.userId, users.id))
          .where(and(eq(videos.status, "pending"), gte(videos.createdAt, since)))
          .orderBy(desc(videos.createdAt))
          .limit(limit),

        // Recent NSFW flagged videos
        ctx.db
          .select({
            id: videos.id,
            title: videos.title,
            nsfwScore: videos.nsfwScore,
            updatedAt: videos.updatedAt,
            userName: users.name,
          })
          .from(videos)
          .leftJoin(users, eq(videos.userId, users.id))
          .where(and(eq(videos.isNsfw, true), gte(videos.updatedAt, since)))
          .orderBy(desc(videos.updatedAt))
          .limit(limit),

        // Recent new users
        ctx.db
          .select({
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(gte(users.createdAt, since))
          .orderBy(desc(users.createdAt))
          .limit(limit),
      ]);

      // Merge into a unified timeline
      type ActivityItem = {
        id: string;
        type: "ban" | "report" | "toxic_comment" | "pending_video" | "nsfw_video" | "new_user";
        title: string;
        description: string;
        timestamp: Date;
        severity: "info" | "warning" | "danger";
      };

      const activities: ActivityItem[] = [];

      for (const ban of recentBans) {
        activities.push({
          id: `ban-${ban.id}`,
          type: "ban",
          title: `User banned: ${ban.name}`,
          description: ban.banReason || "No reason provided",
          timestamp: ban.updatedAt,
          severity: "danger",
        });
      }

      for (const report of recentReports) {
        activities.push({
          id: `report-${report.id}`,
          type: "report",
          title: `${report.targetType} reported`,
          description: `${report.reason} — by ${report.reporterName ?? "Unknown"}`,
          timestamp: report.createdAt,
          severity: report.status === "pending" ? "warning" : "info",
        });
      }

      for (const tc of recentToxicComments) {
        activities.push({
          id: `toxic-${tc.id}`,
          type: "toxic_comment",
          title: `Toxic comment by ${tc.userName ?? "Unknown"}`,
          description: tc.content.slice(0, 120) + (tc.content.length > 120 ? "…" : ""),
          timestamp: tc.createdAt,
          severity: "danger",
        });
      }

      for (const pv of recentPendingVideos) {
        activities.push({
          id: `pending-${pv.id}`,
          type: "pending_video",
          title: `Video pending review`,
          description: `"${pv.title}" by ${pv.userName ?? "Unknown"}`,
          timestamp: pv.createdAt,
          severity: "warning",
        });
      }

      for (const nv of recentNsfwVideos) {
        activities.push({
          id: `nsfw-${nv.id}`,
          type: "nsfw_video",
          title: `NSFW flagged video`,
          description: `"${nv.title}" by ${nv.userName ?? "Unknown"}`,
          timestamp: nv.updatedAt,
          severity: "danger",
        });
      }

      for (const nu of recentUsers) {
        activities.push({
          id: `user-${nu.id}`,
          type: "new_user",
          title: `New user joined`,
          description: nu.name,
          timestamp: nu.createdAt,
          severity: "info",
        });
      }

      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(0, limit);
    }),

  // ─── Admin Notifications ──────────────────────────────────────────────────

  // Get admin notifications
  getAdminNotifications: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(30),
        unreadOnly: z.boolean().default(false),
        priority: z.enum(["all", "low", "medium", "high", "critical"]).default("all"),
        type: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(adminNotifications.isDismissed, false)];
      if (input.unreadOnly) {
        conditions.push(eq(adminNotifications.isRead, false));
      }
      if (input.priority !== "all") {
        conditions.push(eq(adminNotifications.priority, input.priority));
      }

      const notifs = await ctx.db
        .select()
        .from(adminNotifications)
        .where(and(...conditions))
        .orderBy(desc(adminNotifications.createdAt))
        .limit(input.limit);

      return notifs;
    }),

  // Get unread admin notification count
  getAdminNotificationCount: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(adminNotifications)
      .where(
        and(
          eq(adminNotifications.isRead, false),
          eq(adminNotifications.isDismissed, false)
        )
      );
    return Number(result[0]?.count ?? 0);
  }),

  // Mark admin notification as read
  markAdminNotificationRead: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(adminNotifications)
        .set({ isRead: true })
        .where(eq(adminNotifications.id, input.id));
      return { success: true };
    }),

  // Mark all admin notifications as read
  markAllAdminNotificationsRead: adminProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.isRead, false));
    return { success: true };
  }),

  // Dismiss admin notification
  dismissAdminNotification: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(adminNotifications)
        .set({ isDismissed: true })
        .where(eq(adminNotifications.id, input.id));
      return { success: true };
    }),

  // Dismiss all read admin notifications
  dismissAllReadAdminNotifications: adminProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(adminNotifications)
      .set({ isDismissed: true })
      .where(eq(adminNotifications.isRead, true));
    return { success: true };
  }),
});
