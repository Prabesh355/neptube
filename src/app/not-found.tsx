import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="relative mb-6">
        <div className="text-[120px] font-black text-primary/10 leading-none select-none">404</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <Search className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" />
          Go to Feed
        </Link>
      </div>
    </div>
  );
}
