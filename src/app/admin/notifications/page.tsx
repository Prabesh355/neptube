"use client";

import { trpc } from "@/trpc/client";
import { useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Video,
  MessageSquare,
  AlertTriangle,
  Flag,
  Users,
  FileText,
  Shield,
  Flame,
  Filter,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeConfig: Record<
  string,
  { icon: typeof Bell; color: string; bg: string }
> = {
  new_video_upload: { icon: Video, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  new_comment: { icon: MessageSquare, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
  toxic_comment: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
  new_report: { icon: Flag, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
  new_community_post: { icon: FileText, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
  new_user_signup: { icon: Users, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-900/20" },
  video_updated: { icon: Video, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  nsfw_flagged: { icon: Shield, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20" },
  spam_detected: { icon: Flame, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function AdminNotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const utils = trpc.useUtils();

  const { data: notifications, isLoading } =
    trpc.admin.getAdminNotifications.useQuery({
      limit: 50,
      unreadOnly,
      priority: priorityFilter as "all" | "low" | "medium" | "high" | "critical",
    });

  const { data: unreadCount } =
    trpc.admin.getAdminNotificationCount.useQuery();

  const markRead = trpc.admin.markAdminNotificationRead.useMutation({
    onSuccess: () => {
      utils.admin.getAdminNotifications.invalidate();
      utils.admin.getAdminNotificationCount.invalidate();
    },
  });

  const markAllRead = trpc.admin.markAllAdminNotificationsRead.useMutation({
    onSuccess: () => {
      utils.admin.getAdminNotifications.invalidate();
      utils.admin.getAdminNotificationCount.invalidate();
    },
  });

  const dismiss = trpc.admin.dismissAdminNotification.useMutation({
    onSuccess: () => {
      utils.admin.getAdminNotifications.invalidate();
      utils.admin.getAdminNotificationCount.invalidate();
    },
  });

  const dismissAllRead = trpc.admin.dismissAllReadAdminNotifications.useMutation({
    onSuccess: () => {
      utils.admin.getAdminNotifications.invalidate();
      utils.admin.getAdminNotificationCount.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            Admin Notifications
            {(unreadCount ?? 0) > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Notifications about user and creator activity on the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || (unreadCount ?? 0) === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
          <button
            onClick={() => dismissAllRead.mutate()}
            disabled={dismissAllRead.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground bg-accent rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters:
        </div>
        <button
          onClick={() => setUnreadOnly(!unreadOnly)}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
            unreadOnly
              ? "bg-blue-600 text-white"
              : "bg-accent text-muted-foreground hover:bg-accent/80"
          }`}
        >
          Unread only
        </button>
        {["all", "low", "medium", "high", "critical"].map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`px-3 py-1.5 text-sm rounded-full capitalize transition-colors ${
              priorityFilter === p
                ? "bg-blue-600 text-white"
                : "bg-accent text-muted-foreground hover:bg-accent/80"
            }`}
          >
            {p === "all" ? "All priorities" : p}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {!notifications || notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            No notifications
          </h3>
          <p className="text-muted-foreground mt-1">
            {unreadOnly
              ? "All caught up! No unread notifications."
              : "No admin notifications yet. They'll appear here when users take actions."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const config = typeConfig[notif.type] ?? {
              icon: Bell,
              color: "text-muted-foreground",
              bg: "bg-muted",
            };
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  notif.isRead
                    ? "bg-card border-border"
                    : "bg-blue-50/40 border-blue-200 shadow-sm dark:bg-blue-900/10 dark:border-blue-800"
                }`}
              >
                {/* Unread dot */}
                {!notif.isRead && (
                  <span className="absolute top-4 left-2 h-2 w-2 rounded-full bg-blue-600" />
                )}

                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}
                >
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground">
                      {notif.title}
                    </h4>
                    <span
                      className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full capitalize ${
                        priorityColors[notif.priority] ?? priorityColors.medium
                      }`}
                    >
                      {notif.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {notif.message}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {notif.link && (
                    <a
                      href={notif.link}
                      className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Go to"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                  {!notif.isRead && (
                    <button
                      onClick={() => markRead.mutate({ id: notif.id })}
                      className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => dismiss.mutate({ id: notif.id })}
                    className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
