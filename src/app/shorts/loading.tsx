import { Skeleton } from "@/components/ui/skeleton";

export default function ShortsLoading() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-56px)]">
      <div className="w-[380px] h-[680px]">
        <Skeleton className="w-full h-full rounded-2xl" />
      </div>
    </div>
  );
}
