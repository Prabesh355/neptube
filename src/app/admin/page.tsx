"use client";

import { trpc } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Video, MessageSquare, Eye, Ban, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse bg-neutral-800">
              <CardHeader className="pb-2">
                <div className="h-4 bg-neutral-700 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-neutral-700 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Videos",
      value: stats?.totalVideos ?? 0,
      icon: Video,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Comments",
      value: stats?.totalComments ?? 0,
      icon: MessageSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Total Views",
      value: stats?.totalViews ?? 0,
      icon: Eye,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Banned Users",
      value: stats?.bannedUsers ?? 0,
      icon: Ban,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Pending Videos",
      value: stats?.pendingVideos ?? 0,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Overview of your NepTube platform statistics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow bg-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor.replace('100','900')}`}> {/* darken icon bg */}
                <stat.icon className={`h-5 w-5 ${stat.color.replace('600','400')}`} /> {/* darken icon color */}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-100">
                {stat.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="bg-neutral-800">
          <CardHeader>
            <CardTitle className="text-gray-300">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/admin/users"
              className="block p-4 border border-neutral-700 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-medium text-gray-100">Manage Users</p>
                  <p className="text-sm text-gray-400">
                    View, ban, or change user roles
                  </p>
                </div>
              </div>
            </a>
            <a
              href="/admin/videos"
              className="block p-4 border border-neutral-700 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-green-400" />
                <div>
                  <p className="font-medium text-gray-100">Moderate Videos</p>
                  <p className="text-sm text-gray-400">
                    Approve, reject, or remove videos
                  </p>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card className="bg-neutral-800">
          <CardHeader>
            <CardTitle className="text-gray-300">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Database</span>
                <span className="flex items-center gap-2 text-green-400">
                  <div className="h-2 w-2 bg-green-700 rounded-full"></div>
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Authentication</span>
                <span className="flex items-center gap-2 text-green-400">
                  <div className="h-2 w-2 bg-green-700 rounded-full"></div>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">API</span>
                <span className="flex items-center gap-2 text-green-400">
                  <div className="h-2 w-2 bg-green-700 rounded-full"></div>
                  Operational
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
