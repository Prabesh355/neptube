"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function VideoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Video page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold mb-2">Video unavailable</h2>
      <p className="text-muted-foreground text-center max-w-md mb-6 text-sm">
        {error.message || "This video could not be loaded. It may have been removed or is temporarily unavailable."}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={reset} variant="outline" className="gap-2 rounded-lg">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Link href="/feed">
          <Button variant="ghost" className="gap-2 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
            Back to feed
          </Button>
        </Link>
      </div>
    </div>
  );
}
