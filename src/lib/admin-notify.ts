import { adminNotifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";

type AdminNotificationType =
  | "new_video_upload"
  | "new_comment"
  | "toxic_comment"
  | "new_report"
  | "new_community_post"
  | "new_user_signup"
  | "video_updated"
  | "nsfw_flagged"
  | "spam_detected";

type AdminNotificationPriority = "low" | "medium" | "high" | "critical";

interface AdminNotifyParams {
  type: AdminNotificationType;
  priority?: AdminNotificationPriority;
  title: string;
  message: string;
  link?: string;
  actorId?: string;
  targetType?: "video" | "comment" | "community_post" | "report" | "user";
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an admin notification. Fire-and-forget — call inside a try/catch.
 * All admin/moderator users will see this in the admin panel.
 */
export async function notifyAdmins(
  db: typeof import("@/db").db,
  params: AdminNotifyParams
) {
  await db.insert(adminNotifications).values({
    type: params.type,
    priority: params.priority ?? "medium",
    title: params.title,
    message: params.message,
    link: params.link,
    actorId: params.actorId,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata,
  });
}
