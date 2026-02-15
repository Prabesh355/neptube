"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count} views`;
}

export default function LikedVideosPage() {
  const { data, isLoading } = trpc.playlists.getLikedVideos.useQuery({
    limit: 50,
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ThumbsUp className="h-6 w-6 text-primary" />
          Liked Videos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data?.length ?? 0} videos
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-44 aspect-video rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ThumbsUp className="h-10 w-10 text-primary/60" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No liked videos</h2>
          <p className="text-muted-foreground text-sm">
            Videos you like will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((video) => (
            <Link
              key={video.id}
              href={`/feed/${video.id}`}
              className="group flex gap-4 p-3 rounded-xl border border-border bg-card hover:border-primary/20 transition-all"
            >
              <div className="relative w-44 aspect-video bg-muted rounded-lg overflow-hidden flex-shrink-0">
                {video.thumbnailURL ? (
                  <Image
                    src={video.thumbnailURL}
                    alt={video.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <span className="text-primary text-xl font-bold">
                      {video.title[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 py-1">
                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {video.user.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatViewCount(video.viewCount)} ·{" "}
                  {formatDistanceToNow(new Date(video.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
