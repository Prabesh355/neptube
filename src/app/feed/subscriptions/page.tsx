"use client";

import { Suspense, useRef, useState, useCallback, useEffect } from "react";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  PlaySquare, Play, Film, MessageSquare, Heart, ThumbsDown,
  ChevronLeft, ChevronRight, Video, Users, Flame,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count} views`;
}

// ─── Section Tabs ───────────────────────────────────────────────────
const sectionTabs = [
  { id: "all" as const, label: "All", icon: Flame },
  { id: "videos" as const, label: "Videos", icon: Video },
  { id: "shorts" as const, label: "Shorts", icon: Film },
  { id: "community" as const, label: "Community", icon: MessageSquare },
];

type SectionTab = (typeof sectionTabs)[number]["id"];

// ─── Video Card ─────────────────────────────────────────────────────
function SubVideoCard({ video }: {
  video: {
    id: string; title: string; thumbnailURL: string | null;
    viewCount: number; createdAt: Date | string; isNsfw?: boolean | null;
    user: { id: string; name: string; imageURL: string };
  };
}) {
  return (
    <Link href={`/feed/${video.id}`} className="group block">
      <div className="rounded-xl overflow-hidden border border-border/30 bento-card hover:shadow-lg transition-shadow">
        <div className="relative aspect-video bg-muted">
          {video.isNsfw && (
            <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-xl flex items-center justify-center">
              <span className="text-red-400 text-xs font-medium">NSFW</span>
            </div>
          )}
          {video.thumbnailURL ? (
            <Image src={video.thumbnailURL} alt={video.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Play className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="p-3 bg-card">
          <div className="flex gap-2.5">
            <div className="flex-shrink-0 pt-0.5">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                {video.user.imageURL ? (
                  <Image src={video.user.imageURL} alt={video.user.name} width={32} height={32} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-semibold">{video.user.name[0]?.toUpperCase()}</div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-2 leading-snug text-foreground group-hover:text-primary transition-colors">{video.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{video.user.name}</p>
              <p className="text-xs text-muted-foreground">{formatViewCount(video.viewCount)} · {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Shorts Horizontal Scroll ───────────────────────────────────────
function SubShortsSection({ shorts }: {
  shorts: {
    id: string; title: string; thumbnailURL: string | null;
    viewCount: number; duration: number | null;
    user: { id: string; name: string; imageURL: string };
  }[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll, shorts.length]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (shorts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <Film className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground">No shorts from your subscriptions yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-end gap-2 mb-3">
        {canScrollLeft && (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => scroll("left")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {canScrollRight && (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => scroll("right")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide pb-2">
        {shorts.map((short) => (
          <Link key={short.id} href={`/shorts?v=${short.id}`} className="w-[160px] flex-shrink-0 snap-start group">
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-muted shorts-card-3d">
              {short.thumbnailURL ? (
                <Image src={short.thumbnailURL} alt={short.title} fill sizes="160px" className="object-cover transition-all duration-500 group-hover:scale-110" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-pink-500/10">
                  <Play className="h-8 w-8 text-primary/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2.5 left-2.5 right-2.5">
                <p className="text-white text-[11px] font-medium line-clamp-2 drop-shadow-lg leading-tight">{short.title}</p>
                <p className="text-white/60 text-[10px] mt-1">{formatViewCount(short.viewCount)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Community Post Card ────────────────────────────────────────────
function SubCommunityPostCard({ post }: {
  post: {
    id: string; type: string; content: string; imageURL: string | null;
    likeCount: number; commentCount: number; createdAt: Date | string;
    pollOptions: { id: string; text: string; voteCount: number }[];
    user: { id: string; name: string; imageURL: string };
  };
}) {
  const totalVotes = post.pollOptions.reduce((sum, o) => sum + o.voteCount, 0);

  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <Link href={`/channel/${post.user.id}`} className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-muted">
            {post.user.imageURL ? (
              <Image src={post.user.imageURL} alt={post.user.name} width={36} height={36} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-semibold">{post.user.name[0]?.toUpperCase()}</div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/channel/${post.user.id}`} className="font-semibold text-sm hover:text-primary transition-colors">{post.user.name}</Link>
          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
        </div>
      </div>

      <p className="text-sm text-foreground whitespace-pre-wrap mb-3 line-clamp-4">{post.content}</p>

      {post.imageURL && (
        <div className="relative w-full rounded-lg overflow-hidden mb-3 bg-muted" style={{ maxHeight: 300 }}>
          <Image src={post.imageURL} alt="Post image" width={600} height={300} className="w-full h-auto object-cover" />
        </div>
      )}

      {post.type === "poll" && post.pollOptions.length > 0 && (
        <div className="space-y-2 mb-3">
          {post.pollOptions.map((option) => {
            const pct = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
            return (
              <div key={option.id} className="relative rounded-lg overflow-hidden border border-border/50 p-2.5">
                <div className="absolute inset-0 bg-primary/10 rounded-lg" style={{ width: `${pct}%` }} />
                <div className="relative flex items-center justify-between">
                  <span className="text-sm font-medium">{option.text}</span>
                  <span className="text-xs text-muted-foreground font-medium">{pct}%</span>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
        </div>
      )}

      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="flex items-center gap-1 text-xs"><Heart className="h-3.5 w-3.5" /> {post.likeCount}</span>
        <span className="flex items-center gap-1 text-xs"><MessageSquare className="h-3.5 w-3.5" /> {post.commentCount}</span>
      </div>
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

// ─── Skeleton Rows ──────────────────────────────────────────────────
function VideoCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-border/30">
      <Skeleton className="aspect-video w-full" />
      <div className="p-3 space-y-2">
        <div className="flex gap-2.5">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityPostSkeleton() {
  return (
    <div className="rounded-xl border border-border/30 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

// ─── Main Feed Component ────────────────────────────────────────────
function SubscriptionsFeed() {
  const [activeTab, setActiveTab] = useState<SectionTab>("all");

  const { data: videosData, isLoading: videosLoading } = trpc.videos.getSubscriptionsFeed.useQuery({ limit: 20 });
  const { data: shortsData, isLoading: shortsLoading } = trpc.videos.getSubscriptionShorts.useQuery({ limit: 20 });
  const { data: communityData, isLoading: communityLoading } = trpc.community.getFeed.useQuery({ limit: 20 });

  const videos = videosData?.items ?? [];
  const shorts = shortsData ?? [];
  const posts = communityData ?? [];
  const channelCount = videosData?.subscribedChannels ?? 0;

  const isAllEmpty = !videosLoading && !shortsLoading && !communityLoading
    && videos.length === 0 && shorts.length === 0 && posts.length === 0;

  if (isAllEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Users className="h-10 w-10 text-primary/60" />
        </div>
        <h2 className="text-lg font-semibold mb-1">No subscription content</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          {channelCount === 0
            ? "Subscribe to channels to see their latest videos, shorts, and posts here."
            : "Channels you follow haven't posted anything recently."}
        </p>
      </div>
    );
  }

  const showVideos = activeTab === "all" || activeTab === "videos";
  const showShorts = activeTab === "all" || activeTab === "shorts";
  const showCommunity = activeTab === "all" || activeTab === "community";

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
        {channelCount > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Latest from your {channelCount} subscribed channel{channelCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {sectionTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-10">
        {/* ── Videos Section ── */}
        {showVideos && (
          <section>
            <SectionHeader icon={Video} title="Videos" count={videos.length} />
            {videosLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <VideoCardSkeleton key={i} />)}
              </div>
            ) : videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {videos.map((video) => <SubVideoCard key={video.id} video={video} />)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No videos from subscriptions yet.</p>
            )}
          </section>
        )}

        {/* ── Shorts Section ── */}
        {showShorts && (
          <section>
            <SectionHeader icon={Film} title="Shorts" count={shorts.length} />
            {shortsLoading ? (
              <div className="flex gap-3 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="w-[160px] flex-shrink-0 rounded-2xl" style={{ aspectRatio: "9/16" }} />
                ))}
              </div>
            ) : (
              <SubShortsSection shorts={shorts} />
            )}
          </section>
        )}

        {/* ── Community Posts Section ── */}
        {showCommunity && (
          <section>
            <SectionHeader icon={MessageSquare} title="Community Posts" count={posts.length} />
            {communityLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => <CommunityPostSkeleton key={i} />)}
              </div>
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map((post) => <SubCommunityPostCard key={post.id} post={post} />)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No community posts from subscriptions yet.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-6" />
          <div className="flex gap-2 mb-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
          </div>
          <div className="space-y-10">
            <div>
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <VideoCardSkeleton key={i} />)}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <SubscriptionsFeed />
    </Suspense>
  );
}
