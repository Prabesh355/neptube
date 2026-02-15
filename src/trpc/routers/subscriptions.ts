import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { subscriptions, users, notifications } from "@/db/schema";

export const subscriptionsRouter = createTRPCRouter({
  // Check if subscribed to a channel
  isSubscribed: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const sub = await ctx.db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.subscriberId, ctx.user.id),
            eq(subscriptions.channelId, input.channelId)
          )
        )
        .limit(1);

      return !!sub[0];
    }),

  // Get subscription count for a channel
  getCount: baseProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.channelId, input.channelId));

      return result[0]?.count ?? 0;
    }),

  // Get user's subscriptions
  getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const subs = await ctx.db
      .select({
        id: subscriptions.id,
        createdAt: subscriptions.createdAt,
        channel: {
          id: users.id,
          name: users.name,
          imageURL: users.imageURL,
        },
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.channelId, users.id))
      .where(eq(subscriptions.subscriberId, ctx.user.id));

    return subs;
  }),

  // Toggle subscription
  toggle: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Can't subscribe to yourself
      if (ctx.user.id === input.channelId) {
        throw new Error("Cannot subscribe to yourself");
      }

      const existing = await ctx.db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.subscriberId, ctx.user.id),
            eq(subscriptions.channelId, input.channelId)
          )
        )
        .limit(1);

      if (existing[0]) {
        // Unsubscribe
        await ctx.db
          .delete(subscriptions)
          .where(eq(subscriptions.id, existing[0].id));

        return { subscribed: false };
      } else {
        // Subscribe
        await ctx.db.insert(subscriptions).values({
          subscriberId: ctx.user.id,
          channelId: input.channelId,
        });

        // Send notification to channel owner
        await ctx.db.insert(notifications).values({
          userId: input.channelId,
          type: "subscription",
          title: "New subscriber",
          message: `${ctx.user.name} subscribed to your channel`,
          link: `/channel/${ctx.user.id}`,
          fromUserId: ctx.user.id,
        }).catch(() => {});

        return { subscribed: true };
      }
    }),
});
