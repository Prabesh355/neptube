"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDropzone } from "@/lib/uploadthing";
import {
  ArrowLeft,
  Loader2,
  Video,
  ImageIcon,
  Sparkles,
  Save,
  RefreshCw,
  Check,
  Lock,
  Globe,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { extractMultipleFrames, type ExtractedFrame } from "@/lib/extract-video-frame";

const categories = [
  "Entertainment",
  "Music",
  "Gaming",
  "Education",
  "Sports",
  "News",
  "Comedy",
  "Technology",
  "Travel",
  "Other",
];

const visibilityOptions = [
  {
    value: "public",
    label: "Public",
    icon: Globe,
    description: "Anyone can find and watch your video",
  },
  {
    value: "unlisted",
    label: "Unlisted",
    icon: Link2,
    description: "Only people with the link can watch",
  },
  {
    value: "private",
    label: "Private",
    icon: Lock,
    description: "Only you can watch this video",
  },
];

export default function EditVideoPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = params.videoId as string;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("public");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  // Thumbnail extraction state
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [thumbnailSource, setThumbnailSource] = useState<"auto" | "uploaded" | "ai">("uploaded");

  const utils = trpc.useUtils();

  const { data: video, isLoading } = trpc.videos.getById.useQuery({ id: videoId });

  const updateVideo = trpc.videos.update.useMutation({
    onSuccess: () => {
      utils.videos.getMyVideos.invalidate();
      utils.videos.getById.invalidate({ id: videoId });
      toast.success("Video updated successfully!");
      setTimeout(() => {
        router.push("/studio");
      }, 1500);
    },
    onError: (error) => {
      toast.error("Failed to update video", {
        description: error.message,
      });
      setIsSubmitting(false);
    },
  });

  // Load video data into form
  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description || "");
      setCategory(video.category || "");
      setVisibility(video.visibility);
      setThumbnailUrl(video.thumbnailURL || "");
    }
  }, [video]);

  // Extract frames from video on load
  const extractFramesFromVideo = useCallback(async () => {
    if (!video?.videoURL) return;

    setIsExtractingFrames(true);
    toast.info("Extracting thumbnail options from video...");

    try {
      const frames = await extractMultipleFrames(video.videoURL, 4);
      setExtractedFrames(frames);
      setSelectedFrameIndex(0);
      toast.success("Thumbnail options ready!");
    } catch (error) {
      console.error("Failed to extract frames:", error);
      toast.error("Couldn't extract frames from video", {
        description: "You can upload a custom thumbnail instead",
      });
    } finally {
      setIsExtractingFrames(false);
    }
  }, [video?.videoURL]);

  useEffect(() => {
    if (video?.videoURL && extractedFrames.length === 0 && !thumbnailUrl) {
      extractFramesFromVideo();
    }
  }, [video?.videoURL, extractedFrames.length, thumbnailUrl, extractFramesFromVideo]);

  const generateAIThumbnail = async () => {
    if (!title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingThumbnail(true);
    setThumbnailSource("ai");
    toast.info("Generating AI thumbnail...", {
      description: "This may take a few seconds",
    });

    try {
      const response = await fetch("/api/generate-thumbnail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate thumbnail");
      }

      setThumbnailUrl(data.thumbnailUrl);
      toast.success("AI thumbnail generated!");
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      toast.error("Failed to generate thumbnail", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setThumbnailSource("uploaded");
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleFrameSelect = (index: number) => {
    setSelectedFrameIndex(index);
    setThumbnailSource("auto");
    setThumbnailUrl("");
  };

  const handleCustomThumbnailUpload = (url: string) => {
    setThumbnailUrl(url);
    setThumbnailSource("uploaded");
    toast.success("Thumbnail updated!");
  };

  const resetThumbnail = () => {
    setThumbnailUrl("");
    setThumbnailSource("auto");
    setSelectedFrameIndex(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    // Use uploaded/AI thumbnail, or extracted frame
    let finalThumbnailUrl = thumbnailUrl;
    if (!finalThumbnailUrl && extractedFrames.length > 0 && extractedFrames[selectedFrameIndex]) {
      finalThumbnailUrl = extractedFrames[selectedFrameIndex].dataUrl;
    }

    setIsSubmitting(true);

    updateVideo.mutate({
      id: videoId,
      title: title.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      visibility,
      thumbnailURL: finalThumbnailUrl || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Video not found</h1>
        <Link href="/studio">
          <Button>Back to Studio</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/studio" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold dark:text-white">Edit Video</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs sm:max-w-md">{video.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <Card className="dark:bg-gray-900 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="dark:text-white">Video Title</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter video title"
                      maxLength={100}
                      required
                      className="text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">{title.length}/100 characters</p>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card className="dark:bg-gray-900 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="dark:text-white">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell viewers about your video"
                      rows={6}
                      maxLength={5000}
                      className="text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">{description.length}/5000 characters</p>
                  </div>
                </CardContent>
              </Card>

              {/* Category */}
              <Card className="dark:bg-gray-900 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="dark:text-white">Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="dark:text-white">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Visibility */}
              <Card className="dark:bg-gray-900 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="dark:text-white">Visibility & Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {visibilityOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <label
                          key={option.value}
                          className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            visibility === option.value
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-500"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <div className="pt-1">
                            <Icon className={`h-5 w-5 ${visibility === option.value ? "text-blue-600" : "text-gray-500 dark:text-gray-400"}`} />
                          </div>
                          <div className="flex-1">
                            <input
                              type="radio"
                              value={option.value}
                              checked={visibility === option.value}
                              onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                              className="sr-only"
                            />
                            <p className={`font-medium ${visibility === option.value ? "text-blue-900 dark:text-blue-100" : "dark:text-white"}`}>
                              {option.label}
                            </p>
                            <p className={`text-sm ${visibility === option.value ? "text-blue-700 dark:text-blue-200" : "text-gray-500 dark:text-gray-400"}`}>
                              {option.description}
                            </p>
                          </div>
                          {visibility === option.value && (
                            <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Thumbnail & Preview */}
            <div className="space-y-6">
              {/* Thumbnail Management */}
              <Card className="dark:bg-gray-900 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <ImageIcon className="h-5 w-5" />
                    Thumbnail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {thumbnailUrl && thumbnailSource !== "auto" ? (
                    <div className="space-y-4">
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-green-500">
                        <Image
                          src={thumbnailUrl}
                          alt="Video thumbnail"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                          {thumbnailSource === "uploaded" ? "Custom" : "AI Generated"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
                        onClick={resetThumbnail}
                      >
                        Change Thumbnail
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Extract frames from video */}
                      {extractedFrames.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Select from video</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={extractFramesFromVideo}
                              disabled={isExtractingFrames}
                              className="text-blue-600 dark:text-blue-400 h-8"
                            >
                              <RefreshCw className={`h-4 w-4 ${isExtractingFrames ? "animate-spin" : ""}`} />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {extractedFrames.map((frame, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleFrameSelect(index)}
                                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                                  selectedFrameIndex === index && thumbnailSource === "auto"
                                    ? "border-blue-500 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900"
                                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                                }`}
                              >
                                <Image
                                  src={frame.dataUrl}
                                  alt={`Frame ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                                {selectedFrameIndex === index && thumbnailSource === "auto" && (
                                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                    <Check className="h-6 w-6 text-white drop-shadow-lg" />
                                  </div>
                                )}
                                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                  {frame.timestamp.toFixed(1)}s
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      {extractedFrames.length > 0 && (
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t dark:border-gray-700" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or</span>
                          </div>
                        </div>
                      )}

                      {/* Generate AI */}
                      <Button
                        type="button"
                        onClick={generateAIThumbnail}
                        disabled={isGeneratingThumbnail || !title}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      >
                        {isGeneratingThumbnail ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate AI
                          </>
                        )}
                      </Button>

                      {/* Upload Custom */}
                      <UploadDropzone
                        endpoint="thumbnailUploader"
                        onClientUploadComplete={(res) => {
                          if (res && res[0]) {
                            handleCustomThumbnailUpload(res[0].ufsUrl);
                          }
                        }}
                        onUploadError={(error: Error) => {
                          toast.error("Upload failed", {
                            description: error.message,
                          });
                        }}
                        className="ut-label:text-xs ut-allowed-content:text-xs border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 hover:border-blue-500 transition-colors dark:bg-gray-800"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Preview */}
              <Card className="dark:bg-gray-900 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Video className="h-5 w-5" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {video.videoURL && (
                    <video
                      src={video.videoURL}
                      controls
                      className="w-full rounded-lg bg-black"
                      poster={thumbnailUrl || extractedFrames[selectedFrameIndex]?.dataUrl || undefined}
                    />
                  )}
                  <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Video ID</p>
                      <p className="text-sm font-mono dark:text-gray-300 break-all">{videoId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded</p>
                      <p className="text-sm dark:text-gray-300">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-800">
            <Link href="/studio">
              <Button type="button" variant="outline" className="dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
