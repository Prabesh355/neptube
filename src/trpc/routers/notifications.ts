import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";
import { notifications } from "@/db/schema";

export const notificationsRouter = createTRPCRouter({
  // Get notifications for current user
  getMyNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(notifications.userId, ctx.user.id)];
      if (input.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      const notifs = await ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit);

      return notifs;
    }),

  // Get unread count
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );

    return Number(result[0]?.count ?? 0);
  }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // Mark all as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );
    return { success: true };
  }),

  // Delete notification
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});

// Helper to create a notification (used by other routers)
export async function createNotification(
  db: typeof import("@/db").db,
  data: {
    userId: string;
    type: "new_video" | "comment" | "reply" | "like" | "subscription" | "report_resolved";
    title: string;
    message: string;
    link?: string;
    fromUserId?: string;
    videoId?: string;
  }
) {
  await db.insert(notifications).values(data);
}
