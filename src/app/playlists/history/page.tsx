"use client";

import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { History, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count} views`;
}

export default function HistoryPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.history.getMyHistory.useQuery({
    limit: 50,
  });

  const clearHistory = trpc.history.clearHistory.useMutation({
    onSuccess: () => utils.history.getMyHistory.invalidate(),
  });

  const removeItem = trpc.history.removeFromHistory.useMutation({
    onSuccess: () => utils.history.getMyHistory.invalidate(),
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Watch History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.length ?? 0} videos in history
          </p>
        </div>
        {data && data.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("Clear all watch history?")) {
                clearHistory.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-44 aspect-video rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <History className="h-10 w-10 text-primary/60" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No watch history</h2>
          <p className="text-muted-foreground text-sm">
            Videos you watch will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item.id}
              className="group flex gap-4 p-3 rounded-xl border border-border bg-card hover:border-primary/20 transition-all"
            >
              <Link
                href={`/feed/${item.video.id}`}
                className="relative w-44 aspect-video bg-muted rounded-lg overflow-hidden flex-shrink-0"
              >
                {item.video.thumbnailURL ? (
                  <Image
                    src={item.video.thumbnailURL}
                    alt={item.video.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <span className="text-primary text-xl font-bold">
                      {item.video.title[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/feed/${item.video.id}`}
                  className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors"
                >
                  {item.video.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.user.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatViewCount(item.video.viewCount)} ·{" "}
                  {formatDistanceToNow(new Date(item.video.createdAt), {
                    addSuffix: true,
                  })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Watched{" "}
                  {formatDistanceToNow(new Date(item.watchedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              <button
                onClick={() => removeItem.mutate({ id: item.id })}
                className="opacity-0 group-hover:opacity-100 transition-opacity self-start p-1.5 rounded-md hover:bg-muted"
                title="Remove from history"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
