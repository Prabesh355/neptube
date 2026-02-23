"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useAuth } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ImagePlus,
  BarChart3,
  Send,
  Users,
  MoreVertical,
  Flag,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { toast } from "sonner";

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function CreatePostForm() {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"text" | "image" | "poll">("text");
  const [imageURL, setImageURL] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const utils = trpc.useUtils();

  const createPost = trpc.community.create.useMutation({
    onSuccess: () => {
      setContent("");
      setImageURL("");
      setPollOptions(["", ""]);
      setPostType("text");
      utils.community.getFeed.invalidate();
    },
  });

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;

    const input: {
      content: string;
      type: "text" | "image" | "poll";
      imageURL?: string;
      pollOptions?: string[];
    } = {
      content: content.trim(),
      type: postType,
    };

    if (postType === "image" && imageURL.trim()) {
      input.imageURL = imageURL.trim();
    }

    if (postType === "poll") {
      const validOptions = pollOptions.filter((o) => o.trim());
      if (validOptions.length >= 2) {
        input.pollOptions = validOptions;
      }
    }

    createPost.mutate(input);
  };

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Select
          value={postType}
          onValueChange={(v: "text" | "image" | "poll") => setPostType(v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" />
                Text
              </span>
            </SelectItem>
            <SelectItem value="image">
              <span className="flex items-center gap-1.5">
                <ImagePlus className="h-3.5 w-3.5" />
                Image
              </span>
            </SelectItem>
            <SelectItem value="poll">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Poll
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share something with your community..."
        className="min-h-[100px] resize-none rounded-lg"
        maxLength={3000}
      />

      {postType === "image" && (
        <Input
          value={imageURL}
          onChange={(e) => setImageURL(e.target.value)}
          placeholder="Image URL..."
          className="rounded-lg"
        />
      )}

      {postType === "poll" && (
        <div className="space-y-2">
          {pollOptions.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option}
                onChange={(e) => {
                  const newOptions = [...pollOptions];
                  newOptions[index] = e.target.value;
                  setPollOptions(newOptions);
                }}
                placeholder={`Option ${index + 1}`}
                className="rounded-lg"
                maxLength={200}
              />
              {pollOptions.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePollOption(index)}
                  className="text-muted-foreground"
                >
                  ×
                </Button>
              )}
            </div>
          ))}
          {pollOptions.length < 6 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addPollOption}
              className="rounded-lg"
            >
              + Add option
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || createPost.isPending}
          className="gap-2 rounded-lg"
        >
          <Send className="h-4 w-4" />
          {createPost.isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}

function PollDisplay({
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
      utils.community.getFeed.invalidate();
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
        const percentage =
          totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
        const isVoted = votedOptionId === option.id;

        return (
          <button
            key={option.id}
            onClick={() => {
              if (!isSignedIn) {
                toast.error("Sign in to vote");
                return;
              }
              if (!hasVoted) {
                vote.mutate({ postId, optionId: option.id });
              }
            }}
            disabled={vote.isPending || hasVoted}
            className={`w-full relative overflow-hidden rounded-lg border p-3 text-left transition-colors ${
              isVoted
                ? "border-primary bg-primary/5"
                : hasVoted
                ? "border-border cursor-default"
                : "border-border hover:border-primary/30 cursor-pointer"
            }`}
          >
            <div
              className="absolute inset-0 bg-primary/10 transition-all"
              style={{ width: `${percentage}%` }}
            />
            <div className="relative flex items-center justify-between">
              <span className={`text-sm font-medium ${isVoted ? "text-primary" : ""}`}>
                {option.text}
                {isVoted && " ✓"}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {percentage}% ({option.voteCount})
              </span>
            </div>
          </button>
        );
      })}
      <p className="text-xs text-muted-foreground text-center">
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
        {hasVoted && " · You voted"}
      </p>
    </div>
  );
}

// ─── Report Dialog ──────────────────────────────────────────────────────

function ReportDialog({
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
                  reason === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details (optional)..."
            className="min-h-[80px] resize-none"
            maxLength={1000}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                report.mutate({
                  targetType: "community_post",
                  targetId: postId,
                  reason,
                  description: description || undefined,
                })
              }
              disabled={!reason || report.isPending}
              variant="destructive"
              className="gap-1.5"
            >
              {report.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Flag className="h-4 w-4" />
              )}
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Comments Section ───────────────────────────────────────────────────

function CommentsSection({ postId, postOwnerId }: { postId: string; postOwnerId: string }) {
  const { isSignedIn } = useAuth();
  const [commentText, setCommentText] = useState("");
  const utils = trpc.useUtils();

  const { data: currentUser } = trpc.users.me.useQuery(undefined, {
    enabled: !!isSignedIn,
  });

  const { data: comments, isLoading } = trpc.community.getComments.useQuery(
    { postId, limit: 50 },
    { enabled: true }
  );

  const addComment = trpc.community.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.community.getComments.invalidate({ postId });
      utils.community.getFeed.invalidate();
      utils.community.getByChannel.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteComment = trpc.community.deleteComment.useMutation({
    onSuccess: () => {
      utils.community.getComments.invalidate({ postId });
      utils.community.getFeed.invalidate();
      utils.community.getByChannel.invalidate();
      toast.success("Comment deleted");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = () => {
    if (!commentText.trim()) return;
    addComment.mutate({ postId, content: commentText.trim() });
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {/* Comment input */}
      {isSignedIn && (
        <div className="flex items-start gap-2 mb-3">
          <Avatar className="h-7 w-7 mt-0.5">
            <AvatarImage src={currentUser?.imageURL ?? ""} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {currentUser?.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="h-8 text-sm"
              maxLength={1000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!commentText.trim() || addComment.isPending}
            className="h-8 px-2"
          >
            {addComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2 group">
              <Avatar className="h-6 w-6 mt-0.5">
                <AvatarImage src={comment.user.imageURL} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {comment.user.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">{comment.user.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 break-words">{comment.content}</p>
              </div>
              {/* Delete button for comment owner or post owner */}
              {(comment.userId === currentUser?.id || postOwnerId === currentUser?.id) && (
                <button
                  onClick={() => deleteComment.mutate({ commentId: comment.id })}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                  title="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          No comments yet
        </p>
      )}
    </div>
  );
}

// ─── Post Card ──────────────────────────────────────────────────────────

function PostCard({
  post,
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
}) {
  const { isSignedIn } = useAuth();
  const utils = trpc.useUtils();
  const [showComments, setShowComments] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const { data: currentUser } = trpc.users.me.useQuery(undefined, {
    enabled: !!isSignedIn,
  });

  const { data: hasLiked } = trpc.community.hasLiked.useQuery(
    { postId: post.id },
    { enabled: !!isSignedIn }
  );

  const toggleLike = trpc.community.toggleLike.useMutation({
    onSuccess: (result) => {
      utils.community.getFeed.invalidate();
      utils.community.getByChannel.invalidate();
      utils.community.hasLiked.invalidate({ postId: post.id });
      if (result.liked) setDisliked(false);
    },
  });

  const deletePost = trpc.community.delete.useMutation({
    onSuccess: () => {
      utils.community.getFeed.invalidate();
      utils.community.getByChannel.invalidate();
      toast.success("Post deleted");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const isOwnPost = currentUser?.id === post.user.id;

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 rounded-full">
          <AvatarImage src={post.user.imageURL} />
          <AvatarFallback className="rounded-full bg-primary/10 text-primary">
            {post.user.name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{post.user.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {/* More menu (delete for owner, report for others) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnPost && (
                  <DropdownMenuItem
                    onClick={() => deletePost.mutate({ id: post.id })}
                    className="text-destructive focus:text-destructive gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete post
                  </DropdownMenuItem>
                )}
                {isSignedIn && !isOwnPost && (
                  <DropdownMenuItem
                    onClick={() => setReportOpen(true)}
                    className="gap-2"
                  >
                    <Flag className="h-4 w-4" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>

          {post.imageURL && (
            <div className="mt-3 rounded-lg overflow-hidden border border-border">
              <Image
                src={post.imageURL}
                alt="Post image"
                width={600}
                height={400}
                className="w-full object-cover max-h-96"
              />
            </div>
          )}

          {post.type === "poll" && post.pollOptions.length > 0 && (
            <PollDisplay options={post.pollOptions} postId={post.id} />
          )}

          {/* Action bar: like, dislike, comment toggle */}
          <div className="flex items-center gap-1 mt-3">
            {/* Like button */}
            <button
              onClick={() => {
                if (!isSignedIn) {
                  toast.error("Sign in to like posts");
                  return;
                }
                toggleLike.mutate({ postId: post.id });
              }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                hasLiked
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
              {post.likeCount > 0 ? formatCount(post.likeCount) : ""}
            </button>

            {/* Dislike button (visual only, like YouTube) */}
            <button
              onClick={() => {
                if (!isSignedIn) {
                  toast.error("Sign in to dislike posts");
                  return;
                }
                setDisliked(!disliked);
              }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                disliked
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <ThumbsDown className={`h-4 w-4 ${disliked ? "fill-current" : ""}`} />
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-border mx-1" />

            {/* Comment toggle */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                showComments
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              {post.commentCount > 0 ? formatCount(post.commentCount) : ""}
              {showComments ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>

          {/* Comments section */}
          {showComments && (
            <CommentsSection postId={post.id} postOwnerId={post.user.id} />
          )}
        </div>
      </div>

      {/* Report dialog */}
      <ReportDialog
        postId={post.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </div>
  );
}

export default function CommunityPage() {
  const { isSignedIn } = useAuth();

  const { data: posts, isLoading } = trpc.community.getFeed.useQuery(
    { limit: 30 },
    { enabled: !!isSignedIn }
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold tracking-tight mb-6">
        <span className="gradient-text">Community</span>
      </h1>

      {isSignedIn && <CreatePostForm />}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : !isSignedIn ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-10 w-10 text-primary/60" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Sign in to view community</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              See posts from creators you&apos;re subscribed to.
            </p>
          </div>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-10 w-10 text-primary/60" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No community posts yet</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Create a post above, or subscribe to channels to see their posts!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
