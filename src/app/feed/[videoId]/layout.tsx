import { Metadata } from "next";
import { db } from "@/db";
import { videos, users } from "@/db/schema";
import { eq } from "drizzle-orm";

type Props = {
  params: Promise<{ videoId: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { videoId } = await params;

  try {
    const video = await db
      .select({
        title: videos.title,
        description: videos.description,
        thumbnailURL: videos.thumbnailURL,
        videoURL: videos.videoURL,
        viewCount: videos.viewCount,
        userName: users.name,
      })
      .from(videos)
      .innerJoin(users, eq(videos.userId, users.id))
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!video[0]) {
      return {
        title: "Video not found - NepTube",
        description: "This video could not be found.",
      };
    }

    const v = video[0];
    const title = `${v.title} - ${v.userName} | NepTube`;
    const description = v.description
      ? v.description.slice(0, 160)
      : `Watch "${v.title}" by ${v.userName} on NepTube. ${v.viewCount} views.`;

    return {
      title,
      description,
      openGraph: {
        title: v.title,
        description: description,
        type: "video.other",
        url: `/feed/${videoId}`,
        siteName: "NepTube",
        images: v.thumbnailURL
          ? [
              {
                url: v.thumbnailURL,
                width: 1280,
                height: 720,
                alt: v.title,
              },
            ]
          : [],
        videos: v.videoURL
          ? [
              {
                url: v.videoURL,
                type: "video/mp4",
              },
            ]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title: v.title,
        description: description,
        images: v.thumbnailURL ? [v.thumbnailURL] : [],
      },
    };
  } catch {
    return {
      title: "NepTube",
      description: "Watch and share videos on NepTube.",
    };
  }
}

export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
