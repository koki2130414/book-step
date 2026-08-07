"use client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
}

// 5段階の星評価。onChangeを渡すと入力用、渡さないと表示専用になる
export function StarRating({ value, onChange, size = 20, readOnly = false }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="おすすめ度">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          aria-label={`星${star}つ`}
          aria-pressed={star <= value}
          onClick={() => onChange?.(star)}
          className={cn("transition-transform", !readOnly && "hover:scale-110")}
        >
          <Star
            size={size}
            className={cn(star <= value ? "fill-clay-500 text-clay-500" : "fill-transparent text-beige-300")}
          />
        </button>
      ))}
    </div>
  );
}
