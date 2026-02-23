"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { useAuth } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function ChannelRedirectPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { data: user, isLoading } = trpc.users.me.useQuery(undefined, {
    enabled: !!isSignedIn,
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/feed");
      return;
    }
    if (user?.id) {
      router.replace(`/channel/${user.id}`);
    }
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <Skeleton className="w-full h-[calc(16vw)] max-h-[200px] rounded-none" />
      <div className="px-6 lg:px-24 py-4">
        <div className="flex items-start gap-5">
          <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1 pt-1">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
