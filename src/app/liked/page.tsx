"use client";

import Link from "next/link";
import { Suspense } from "react";
import { trpc } from "@/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NoLikedVideos } from "@/components/empty-state";

// VideoCard component for liked videos
function VideoCard({ video }: { 
  video: {
    id: string;
    title: string;
    description: string | null;
    thumbnailURL: string | null;
    duration: number | null;
    viewCount: number;
    createdAt: string;
    likedAt?: string;
    user: {
      id: string;
      name: string;
      imageURL: string;
    };
  }; 
}) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? "s" : ""} ago`;
    if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    return "Today";
  };

  return (
    <Link href={`/feed/${video.id}`}>
      <div className="group cursor-pointer card-animate">
        {/* Thumbnail */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-2">
          {video.thumbnailURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailURL}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Eye className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          {video.duration && video.duration > 0 && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded z-10">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="flex gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={video.user.imageURL} alt={video.user.name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {video.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[13px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {video.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {video.user.name}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{formatViewCount(video.viewCount)} views</span>
              {video.likedAt && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Heart className="h-3 w-3" />
                    {formatTimeAgo(video.likedAt)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VideoCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-video rounded-lg mb-2" />
      <div className="flex gap-2">
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function LikedVideosContent() {
  const { data: rawData, isLoading, error } = trpc.playlists.getLikedVideos.useQuery({
    limit: 20,
  });

  // Transform to match VideoCard props
  const data = rawData?.map((item) => ({
    id: item.id,
    title: item.title,
    description: null as string | null,
    thumbnailURL: item.thumbnailURL,
    duration: item.duration,
    viewCount: item.viewCount,
    createdAt: String(item.createdAt),
    user: item.user,
  }));

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
        {[...Array(9)].map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Heart className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Error loading liked videos</h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    );
  }

  if (!data?.length) {
    return <NoLikedVideos />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
      {data.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}

function LikedVideosPageContent() {
  return (
    <div className="py-6 min-h-screen w-full">
      <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2 gradient-text">Liked Videos</h1>
          <p className="text-muted-foreground">
            Videos you&apos;ve liked
          </p>
        </div>

        {/* Liked Videos Content */}
        <LikedVideosContent />
      </div>
    </div>
  );
}

export default function LikedVideosPage() {
  return (
    <Suspense fallback={
      <div className="py-6 min-h-screen w-full">
        <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10">
            {[...Array(6)].map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    }>
      <LikedVideosPageContent />
    </Suspense>
  );
}
