"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Video,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function AnalyticsPage() {
  const { data: videos, isLoading } = trpc.videos.getMyVideos.useQuery({
    limit: 50,
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const allVideos = videos ?? [];
  const totalViews = allVideos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = allVideos.reduce((s, v) => s + v.likeCount, 0);
  const totalDislikes = allVideos.reduce((s, v) => s + v.dislikeCount, 0);
  const totalComments = allVideos.reduce(
    (s, v) => s + (v.commentCount ?? 0),
    0
  );

  const sortedByViews = [...allVideos].sort(
    (a, b) => b.viewCount - a.viewCount
  );
  const topVideos = sortedByViews.slice(0, 10);

  const engagementRate =
    totalViews > 0
      ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(1)
      : "0";

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Creator Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your channel performance
          </p>
        </div>
        <Link href="/studio">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
            Studio
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{formatCount(totalViews)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5" />
              Total Likes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{formatCount(totalLikes)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalDislikes > 0 && (
                <span className="flex items-center gap-1">
                  <ThumbsDown className="h-3 w-3" />
                  {formatCount(totalDislikes)} dislikes
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{formatCount(totalComments)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{engagementRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              (likes + comments) / views
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              Channel Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Videos</span>
              <span className="font-medium">{allVideos.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Public Videos</span>
              <span className="font-medium">
                {allVideos.filter((v) => v.visibility === "public").length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Private Videos</span>
              <span className="font-medium">
                {allVideos.filter((v) => v.visibility === "private").length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Views/Video</span>
              <span className="font-medium">
                {allVideos.length > 0
                  ? formatCount(Math.round(totalViews / allVideos.length))
                  : "0"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Like/Dislike Ratio
              </span>
              <span className="font-medium">
                {totalDislikes > 0
                  ? `${(totalLikes / totalDislikes).toFixed(1)}:1`
                  : `${totalLikes}:0`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Performance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {allVideos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Upload videos to see performance data
              </p>
            ) : (
              <div className="space-y-3">
                {topVideos.slice(0, 5).map((video, i) => (
                  <div key={video.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/feed/${video.id}`}
                        className="text-sm font-medium truncate block hover:text-primary transition-colors"
                      >
                        {video.title}
                      </Link>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatCount(video.viewCount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Videos table */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">
            All Videos Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {allVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No videos yet. Upload your first video to see analytics.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Dislikes</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedByViews.map((video) => {
                  const eng =
                    video.viewCount > 0
                      ? (
                          ((video.likeCount + (video.commentCount ?? 0)) /
                            video.viewCount) *
                          100
                        ).toFixed(1)
                      : "0";
                  return (
                    <TableRow key={video.id}>
                      <TableCell className="max-w-[300px]">
                        <Link
                          href={`/feed/${video.id}`}
                          className="font-medium text-sm truncate block hover:text-primary transition-colors"
                        >
                          {video.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCount(video.viewCount)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCount(video.likeCount)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCount(video.dislikeCount)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCount(video.commentCount ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {eng}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
