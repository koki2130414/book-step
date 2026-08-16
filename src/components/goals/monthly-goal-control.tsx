"use client";
import { useState, useTransition } from "react";
import { Minus, Plus, Loader2 } from "lucide-react";

interface MonthlyGoalControlProps {
  initialCount: number;
  target: number;
  // ホーム側で定義したサーバーアクション。冊数を delta 分だけ増減し、確定後の冊数を返す
  adjustAction: (delta: number) => Promise<number>;
}

// 今月の読書目標の進捗を、自分で「+読んだ / −」して調整できるカード内コントロール
export function MonthlyGoalControl({ initialCount, target, adjustAction }: MonthlyGoalControlProps) {
  const [count, setCount] = useState(Math.max(0, initialCount));
  const [isPending, startTransition] = useTransition();

  const change = (delta: number) => {
    const prev = count;
    // まず楽観的に反映して、サーバー確定値で上書きする
    setCount(Math.max(0, prev + delta));
    startTransition(async () => {
      try {
        const next = await adjustAction(delta);
        setCount(Math.max(0, next));
      } catch {
        setCount(prev);
      }
    });
  };

  const pct = target > 0 ? Math.min(100, (count / target) * 100) : 0;
  const achieved = count >= target && target > 0;

  return (
    <div>
      <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-beige-200">
        <div className="h-full bg-forest-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink/60">
          {count} / {target} 冊{achieved && " 🎉 達成!"}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => change(-1)}
            disabled={isPending || count <= 0}
            aria-label="1冊減らす"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-beige-300 text-ink/60 transition-colors hover:bg-beige-100 disabled:cursor-default disabled:opacity-40"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={() => change(1)}
            disabled={isPending}
            aria-label="1冊増やす"
            className="flex items-center gap-1 rounded-full border border-forest-600 px-3 py-1 text-xs font-medium text-forest-700 transition-colors hover:bg-forest-600 hover:text-paper disabled:opacity-60"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            読んだ
          </button>
        </div>
      </div>
    </div>
  );
}
