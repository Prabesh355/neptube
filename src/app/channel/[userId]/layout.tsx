import { HomeLayout } from "@/modules/home/ui/layout/home-layout";
import { Metadata } from "next";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type Props = {
  params: Promise<{ userId: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;

  try {
    const user = await db
      .select({
        name: users.name,
        description: users.description,
        imageURL: users.imageURL,
        bannerURL: users.bannerURL,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]) {
      return { title: "Channel not found - NepTube" };
    }

    const u = user[0];
    return {
      title: `${u.name} - NepTube`,
      description: u.description || `${u.name}'s channel on NepTube`,
      openGraph: {
        title: `${u.name} - NepTube`,
        description: u.description || `Watch videos from ${u.name} on NepTube`,
        type: "profile",
        images: u.imageURL ? [{ url: u.imageURL, width: 200, height: 200, alt: u.name }] : [],
      },
      twitter: {
        card: "summary",
        title: u.name,
        description: u.description || `${u.name}'s channel on NepTube`,
        images: u.imageURL ? [u.imageURL] : [],
      },
    };
  } catch {
    return { title: "NepTube" };
  }
}

export default function ChannelLayout({ children }: { children: React.ReactNode }) {
  return <HomeLayout>{children}</HomeLayout>;
}
