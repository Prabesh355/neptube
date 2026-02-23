"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  PlayCircle,
  Edit3,
  Save,
  X,
  ImageIcon,
  FileText,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Camera,
  MoreVertical,
  Flag,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// ─── Channel Poll Display ───────────────────────────────────────────────

function ChannelPollDisplay({
  options,
  postId,
}: {
  options: { id: string; text: string; voteCount: number }[];
  postId: string;
}) {
  const { isSignedIn } = useAuth();
  const utils = trpc.useUtils();

  const { data: votedData } = trpc.community.hasVoted.useQuery(
    { postId },
    { enabled: !!isSignedIn }
  );

  const vote = trpc.community.vote.useMutation({
    onSuccess: () => {
      utils.community.getByChannel.invalidate();
      utils.community.hasVoted.invalidate({ postId });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);
  const hasVoted = !!votedData;
  const votedOptionId = votedData?.optionId;

  return (
    <div className="space-y-2 mt-3">
      {options.map((option) => {
        const percentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
        const isVoted = votedOptionId === option.id;
        return (
          <button
            key={option.id}
            onClick={() => {
              if (!isSignedIn) { toast.error("Sign in to vote"); return; }
              if (!hasVoted) vote.mutate({ postId, optionId: option.id });
            }}
            disabled={vote.isPending || hasVoted}
            className={`w-full relative overflow-hidden rounded-lg border p-3 text-left transition-colors ${
              isVoted ? "border-primary bg-primary/5" : hasVoted ? "border-border cursor-default" : "border-border hover:border-primary/30 cursor-pointer"
            }`}
          >
            <div className="absolute inset-0 bg-primary/10 transition-all" style={{ width: `${percentage}%` }} />
            <div className="relative flex items-center justify-between">
              <span className={`text-sm font-medium ${isVoted ? "text-primary" : ""}`}>
                {option.text}{isVoted && " ✓"}
              </span>
              <span className="text-xs text-muted-foreground ml-2">{percentage}% ({option.voteCount})</span>
            </div>
          </button>
        );
      })}
      <p className="text-xs text-muted-foreground text-center">
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}{hasVoted && " · You voted"}
      </p>
    </div>
  );
}

// ─── Channel Report Dialog ──────────────────────────────────────────────

function ChannelReportDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const report = trpc.reports.create.useMutation({
    onSuccess: () => {
      toast.success("Report submitted. Our team will review it.");
      onOpenChange(false);
      setReason("");
      setDescription("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const reasons = [
    "Spam or misleading",
    "Hateful or abusive content",
    "Harassment or bullying",
    "Harmful or dangerous acts",
    "Sexual content",
    "Violence or graphic content",
    "Misinformation",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report community post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                  reason === r ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details (optional)..." className="min-h-[80px] resize-none" maxLength={1000} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={() => report.mutate({ targetType: "community_post", targetId: postId, reason, description: description || undefined })}
              disabled={!reason || report.isPending}
              variant="destructive"
              className="gap-1.5"
            >
              {report.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Channel Comments Section ───────────────────────────────────────────

function ChannelCommentsSection({ postId, postOwnerId }: { postId: string; postOwnerId: string }) {
  const { isSignedIn } = useAuth();
  const [commentText, setCommentText] = useState("");
  const utils = trpc.useUtils();

  const { data: currentUser } = trpc.users.me.useQuery(undefined, { enabled: !!isSignedIn });

  const { data: comments, isLoading } = trpc.community.getComments.useQuery({ postId, limit: 50 });

  const addComment = trpc.community.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.community.getComments.invalidate({ postId });
      utils.community.getByChannel.invalidate();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const deleteComment = trpc.community.deleteComment.useMutation({
    onSuccess: () => {
      utils.community.getComments.invalidate({ postId });
      utils.community.getByChannel.invalidate();
      toast.success("Comment deleted");
    },
    onError: (err) => { toast.error(err.message); },
  });

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {isSignedIn && (
        <div className="flex items-start gap-2 mb-3">
          <Avatar className="h-7 w-7 mt-0.5">
            <AvatarImage src={currentUser?.imageURL ?? ""} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{currentUser?.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="h-8 text-sm" maxLength={1000}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (commentText.trim()) addComment.mutate({ postId, content: commentText.trim() }); } }}
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => { if (commentText.trim()) addComment.mutate({ postId, content: commentText.trim() }); }} disabled={!commentText.trim() || addComment.isPending} className="h-8 px-2">
            {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (<div key={i} className="flex items-start gap-2"><Skeleton className="h-6 w-6 rounded-full" /><div className="flex-1 space-y-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-full" /></div></div>))}
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2 group">
              <Avatar className="h-6 w-6 mt-0.5">
                <AvatarImage src={comment.user.imageURL} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{comment.user.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">{comment.user.name}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="text-sm text-foreground/90 break-words">{comment.content}</p>
              </div>
              {(comment.userId === currentUser?.id || postOwnerId === currentUser?.id) && (
                <button onClick={() => deleteComment.mutate({ commentId: comment.id })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1" title="Delete comment">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
      )}
    </div>
  );
}

// ─── Channel Post Card ──────────────────────────────────────────────────

function ChannelPostCard({
  post,
  channelOwnerId,
}: {
  post: {
    id: string;
    type: string;
    content: string;
    imageURL: string | null;
    likeCount: number;
    commentCount: number;
    createdAt: Date | string;
    user: { id: string; name: string; imageURL: string };
    pollOptions: { id: string; text: string; voteCount: number }[];
  };
  channelOwnerId: string;
}) {
  const { isSignedIn } = useAuth();
  const utils = trpc.useUtils();
  const [showComments, setShowComments] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const { data: currentUser } = trpc.users.me.useQuery(undefined, { enabled: !!isSignedIn });

  const { data: hasLiked } = trpc.community.hasLiked.useQuery(
    { postId: post.id },
    { enabled: !!isSignedIn }
  );

  const toggleLike = trpc.community.toggleLike.useMutation({
    onSuccess: (result) => {
      utils.community.getByChannel.invalidate();
      utils.community.hasLiked.invalidate({ postId: post.id });
      if (result.liked) setDisliked(false);
    },
  });

  const deletePost = trpc.community.delete.useMutation({
    onSuccess: () => {
      utils.community.getByChannel.invalidate();
      toast.success("Post deleted");
    },
    onError: (err) => { toast.error(err.message); },
  });

  const isOwnPost = currentUser?.id === post.user.id;

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 rounded-full">
          <AvatarImage src={post.user.imageURL} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {post.user.name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{post.user.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnPost && (
                  <DropdownMenuItem onClick={() => deletePost.mutate({ id: post.id })} className="text-destructive focus:text-destructive gap-2">
                    <Trash2 className="h-4 w-4" /> Delete post
                  </DropdownMenuItem>
                )}
                {isSignedIn && !isOwnPost && (
                  <DropdownMenuItem onClick={() => setReportOpen(true)} className="gap-2">
                    <Flag className="h-4 w-4" /> Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{post.content}</p>
          {post.imageURL && (
            <div className="mt-3 rounded-lg overflow-hidden max-w-md">
              <Image src={post.imageURL} alt="Post image" width={400} height={300} className="object-cover w-full" />
            </div>
          )}
          {post.type === "poll" && post.pollOptions.length > 0 && (
            <ChannelPollDisplay options={post.pollOptions} postId={post.id} />
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1 mt-3">
            <button
              onClick={() => {
                if (!isSignedIn) { toast.error("Sign in to like posts"); return; }
                toggleLike.mutate({ postId: post.id });
              }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                hasLiked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
              {post.likeCount > 0 ? formatViewCount(post.likeCount) : ""}
            </button>
            <button
              onClick={() => { if (!isSignedIn) { toast.error("Sign in to dislike posts"); return; } setDisliked(!disliked); }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                disliked ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <ThumbsDown className={`h-4 w-4 ${disliked ? "fill-current" : ""}`} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                showComments ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              {post.commentCount > 0 ? formatViewCount(post.commentCount) : ""}
              {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {showComments && <ChannelCommentsSection postId={post.id} postOwnerId={post.user.id} />}
        </div>
      </div>
      <ChannelReportDialog postId={post.id} open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
}

// ─── Channel Edit Dialog ────────────────────────────────────────────────

function ChannelEditDialog({
  currentName,
  currentDescription,
  currentBannerURL,
  onSaved,
}: {
  currentName: string;
  currentDescription: string | null;
  currentBannerURL: string | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription ?? "");
  const [bannerURL, setBannerURL] = useState(currentBannerURL ?? "");
  const [open, setOpen] = useState(false);

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      setOpen(false);
      onSaved();
    },
  });

  const handleSave = () => {
    updateProfile.mutate({
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      bannerURL: bannerURL.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-border">
          Customise channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customize your channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Edit3 className="h-3.5 w-3.5" />
              Channel Name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your channel name" maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              About
            </label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell viewers about your channel..." className="min-h-[100px] resize-none" maxLength={1000} />
            <p className="text-[10px] text-muted-foreground text-right">{description.length}/1000</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Banner Image URL
            </label>
            <Input value={bannerURL} onChange={(e) => setBannerURL(e.target.value)} placeholder="https://example.com/banner.jpg" type="url" />
            {bannerURL && (
              <div className="relative w-full h-24 rounded-lg overflow-hidden bg-muted">
                <Image src={bannerURL} alt="Banner preview" fill className="object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateProfile.isPending || !name.trim()} className="gap-1.5">
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Channel Page ───────────────────────────────────────────────────────

export default function ChannelPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<"videos" | "community">("videos");
  const [showFullDescription, setShowFullDescription] = useState(false);

  const { data: channel, isLoading } = trpc.videos.getChannelProfile.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const { data: currentUser } = trpc.users.me.useQuery(undefined, {
    enabled: !!isSignedIn,
  });

  const isOwnChannel = currentUser?.id === userId;

  const { data: subCount } = trpc.subscriptions.getCount.useQuery(
    { channelId: userId },
    { enabled: !!userId }
  );

  const { data: isSubscribed } = trpc.subscriptions.isSubscribed.useQuery(
    { channelId: userId },
    { enabled: !!userId && !!isSignedIn && !isOwnChannel }
  );

  const utils = trpc.useUtils();
  const toggleSub = trpc.subscriptions.toggle.useMutation({
    onSuccess: () => {
      utils.subscriptions.isSubscribed.invalidate({ channelId: userId });
      utils.subscriptions.getCount.invalidate({ channelId: userId });
    },
  });

  const { data: communityPosts } = trpc.community.getByChannel.useQuery(
    { userId, limit: 20 },
    { enabled: !!userId }
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <Skeleton className="w-full h-[calc(16vw)] max-h-[200px] rounded-none" />
        <div className="px-6 lg:px-24 py-4">
          <div className="flex items-start gap-5">
            <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1 pt-1">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-semibold mb-2">Channel not found</h1>
        <Link href="/feed">
          <Button variant="outline">Back to Feed</Button>
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "videos" as const, label: "Home" },
    { id: "videos" as const, label: "Videos" },
    { id: "community" as const, label: "Posts" },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* ── Banner ── */}
      <div className="relative w-full" style={{ aspectRatio: "6.2/1" }}>
        {channel.bannerURL ? (
          <Image
            src={channel.bannerURL}
            alt="Channel banner"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-900" />
        )}
        {/* Edit banner icon for own channel */}
        {isOwnChannel && (
          <div className="absolute top-3 right-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white">
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Channel Info Section ── */}
      <div className="px-6 lg:px-24 pt-4 pb-0">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <Avatar className="h-20 w-20 flex-shrink-0 border-2 border-background">
            <AvatarImage src={channel.imageURL} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {channel.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h1 className="text-2xl font-bold tracking-tight">
              {channel.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <span>@{channel.name.toLowerCase().replace(/\s+/g, "")}</span>
              <span>·</span>
              <span>{formatViewCount(Number(subCount ?? 0))} subscribers</span>
              <span>·</span>
              <span>{channel.videos.length} videos</span>
            </div>

            {/* Description */}
            {channel.description && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="mt-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-left flex items-center gap-1"
              >
                <span className={showFullDescription ? "" : "line-clamp-1"}>
                  {channel.description}
                </span>
                {!showFullDescription && (
                  <span className="text-muted-foreground font-medium whitespace-nowrap">...more</span>
                )}
              </button>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              {isOwnChannel && (
                <>
                  <ChannelEditDialog
                    currentName={channel.name}
                    currentDescription={channel.description}
                    currentBannerURL={channel.bannerURL}
                    onSaved={() => {
                      utils.videos.getChannelProfile.invalidate({ userId });
                      utils.users.me.invalidate();
                    }}
                  />
                  <Link href="/studio">
                    <Button variant="outline" size="sm" className="rounded-full border-border">
                      Manage videos
                    </Button>
                  </Link>
                </>
              )}

              {isSignedIn && !isOwnChannel && (
                <Button
                  onClick={() => toggleSub.mutate({ channelId: userId })}
                  disabled={toggleSub.isPending}
                  variant={isSubscribed ? "outline" : "default"}
                  size="sm"
                  className={`rounded-full ${!isSubscribed ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
                >
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-6 lg:px-24 mt-3 border-b border-border">
        <div className="flex items-center gap-0">
          {[
            { id: "videos" as const, label: "Home" },
            { id: "videos" as const, label: "Videos" },
            { id: "community" as const, label: "Posts" },
          ].map((tab, i) => (
            <button
              key={`${tab.label}-${i}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                (tab.id === activeTab && ((tab.label === "Videos" && activeTab === "videos") || (tab.label === "Posts" && activeTab === "community") || (tab.label === "Home" && activeTab === "videos")))
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {/* Active indicator for current tab label match */}
              {((tab.label === "Home" && activeTab === "videos" && i === 0) ||
                (tab.label === "Videos" && activeTab === "videos" && i === 1)) && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
              )}
              {tab.label === "Posts" && activeTab === "community" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-6 lg:px-24 py-6">
        {activeTab === "videos" && (
          <>
            {channel.videos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                This channel has no videos yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
                {channel.videos.map((video) => (
                  <Link key={video.id} href={`/feed/${video.id}`} className="group">
                    <div className="relative aspect-video bg-muted rounded-xl overflow-hidden mb-2">
                      {video.thumbnailURL ? (
                        <Image
                          src={video.thumbnailURL}
                          alt={video.title}
                          fill
                          className="object-cover group-hover:scale-[1.02] transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <PlayCircle className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatViewCount(video.viewCount)} views · {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "community" && (
          <>
            {!communityPosts || communityPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                No community posts yet.
              </p>
            ) : (
              <div className="space-y-4 max-w-2xl">
                {communityPosts.map((post) => (
                  <ChannelPostCard key={post.id} post={post} channelOwnerId={userId} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
