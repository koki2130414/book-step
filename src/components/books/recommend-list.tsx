"use client";
import { useState, useTransition } from "react";
import { BookOpen, Plus, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

interface Rec {
  title: string;
  author: string;
  reason: string;
}

interface RecommendListProps {
  items: Rec[];
  // ページ側で定義したサーバーアクション。「読みたい」本棚に追加する
  addAction: (title: string, author: string) => Promise<{ ok: boolean; message: string }>;
}

// AIが提案したおすすめ本の一覧。各本はワンタップで「読みたい」に追加できる
export function RecommendList({ items, addAction }: RecommendListProps) {
  const { showToast } = useToast();
  const [added, setAdded] = useState<Record<number, boolean>>({});
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const handleAdd = (idx: number, r: Rec) => {
    setPendingIdx(idx);
    startTransition(async () => {
      try {
        const res = await addAction(r.title, r.author);
        if (res.ok) {
          setAdded((prev) => ({ ...prev, [idx]: true }));
          showToast(res.message || "「読みたい」に追加しました");
        } else {
          // 既に本棚にある場合も追加済み扱いにする
          if (/(既に|すでに)/.test(res.message)) setAdded((prev) => ({ ...prev, [idx]: true }));
          showToast(res.message || "追加できませんでした", "info");
        }
      } catch {
        showToast("追加に失敗しました", "error");
      } finally {
        setPendingIdx(null);
      }
    });
  };

  return (
    <ul className="space-y-3">
      {items.map((r, i) => {
        const isAdded = !!added[i];
        const isBusy = pendingIdx === i;
        return (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-beige-200 bg-paper p-4"
          >
            <div className="mt-0.5 flex h-10 w-8 shrink-0 items-center justify-center rounded bg-beige-100 text-beige-300">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{r.title}</p>
              {r.author && <p className="text-sm text-ink/50">{r.author}</p>}
              {r.reason && <p className="mt-1 text-sm text-ink/70">{r.reason}</p>}
            </div>
            <button
              type="button"
              onClick={() => handleAdd(i, r)}
              disabled={isAdded || isBusy}
              className="flex shrink-0 items-center gap-1 rounded-full border border-forest-600 px-3 py-1.5 text-xs font-medium text-forest-700 transition-colors hover:bg-forest-600 hover:text-paper disabled:cursor-default disabled:opacity-70 disabled:hover:bg-transparent disabled:hover:text-forest-700"
            >
              {isAdded ? (
                <>
                  <Check size={14} />
                  追加済み
                </>
              ) : isBusy ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  追加中
                </>
              ) : (
                <>
                  <Plus size={14} />
                  読みたい
                </>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
