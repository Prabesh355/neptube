"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Video,
  Settings,
  Shield,
  ArrowLeft,
  Flag,
  Activity,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/videos", label: "Videos", icon: Video },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/activity", label: "Activity Log", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { data: user, isLoading } = trpc.users.me.useQuery();
  const { data: unreadCount } = trpc.admin.getAdminNotificationCount.useQuery(undefined, {
    refetchInterval: 30000, // poll every 30s
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Shield className="h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access the admin panel.
        </p>
        <Link
          href="/"
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top navbar */}
      <nav className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/feed"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to NepTube</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-xl text-foreground">Admin Panel</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/notifications"
                className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                title="Admin Notifications"
              >
                <Bell className="h-5 w-5" />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount! > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
              <span className="text-sm text-muted-foreground">
                Logged in as{" "}
                <span className="font-medium text-foreground">{user.name}</span>
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
                {user.role}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card shadow-sm min-h-[calc(100vh-4rem)] border-r border-border">
          <nav className="p-4 space-y-1">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  {item.label === "Notifications" && (unreadCount ?? 0) > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {unreadCount! > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
