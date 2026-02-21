"use client";

import { type LucideIcon, Video, MessageSquare, Heart, Clock, Search, FolderOpen, History, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = Video,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button variant="outline" size="sm" className="rounded-lg">
            {actionLabel}
          </Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Pre-built empty states for common pages
export function NoVideosFound() {
  return (
    <EmptyState
      icon={Video}
      title="No videos yet"
      description="Videos you upload will appear here. Start sharing your content with the world!"
      actionLabel="Upload a Video"
      actionHref="/studio/upload"
    />
  );
}

export function NoCommentsYet() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No comments yet"
      description="Be the first to share your thoughts on this video."
    />
  );
}

export function NoLikedVideos() {
  return (
    <EmptyState
      icon={Heart}
      title="No liked videos"
      description="Videos you like will be saved here for easy access."
      actionLabel="Browse Videos"
      actionHref="/feed"
    />
  );
}

export function NoWatchLater() {
  return (
    <EmptyState
      icon={Clock}
      title="Nothing saved"
      description="Save videos to watch later and they'll show up here."
      actionLabel="Browse Videos"
      actionHref="/feed"
    />
  );
}

export function NoSearchResults() {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try different keywords or check your spelling."
    />
  );
}

export function NoPlaylists() {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No playlists"
      description="Create playlists to organize your favorite videos."
      actionLabel="Browse Videos"
      actionHref="/feed"
    />
  );
}

export function NoWatchHistory() {
  return (
    <EmptyState
      icon={History}
      title="No watch history"
      description="Videos you watch will appear here."
      actionLabel="Browse Videos"
      actionHref="/feed"
    />
  );
}

export function NoNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
    />
  );
}
