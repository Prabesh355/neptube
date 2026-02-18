import { Skeleton } from "@/components/ui/skeleton";

export default function VideoLoading() {
  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
      <div className="flex gap-3 items-center">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}
