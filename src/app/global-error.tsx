"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            An unexpected error occurred. Please try again or go back to the home page.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={reset} variant="outline" className="gap-2 rounded-lg">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Link href="/">
              <Button className="gap-2 rounded-lg">
                <Home className="h-4 w-4" />
                Go home
              </Button>
            </Link>
          </div>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-4">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
