"use client";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleLike } from "@/app/(main)/books/actions";

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ postId, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));
    startTransition(async () => {
      try {
        await toggleLike(postId, liked);
      } catch {
        // 失敗時は表示を元に戻す
        setLiked(liked);
        setCount((c) => c + (nextLiked ? -1 : 1));
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={liked}
      aria-label="いいね"
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        liked ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-beige-300 text-ink/60",
      )}
    >
      <Heart size={16} className={cn(liked && "fill-destructive")} />
      {count}
    </button>
  );
}
