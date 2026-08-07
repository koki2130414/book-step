import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-beige-100", className)} />;
}

export function BookCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-lg border border-beige-200 p-3">
      <Skeleton className="h-24 w-16 shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}
