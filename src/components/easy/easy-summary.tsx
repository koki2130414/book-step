"use client";
import { useState, useTransition } from "react";
import { BookOpen, Sparkles, Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

interface EasyBook {
  title: string;
  author: string;
  cover: string | null;
}

interface EasySummaryProps {
  books: EasyBook[];
  // ページ側で定義したサーバーアクション。1冊のかんたん要約を返す
  summarizeAction: (
    title: string,
    author: string,
  ) => Promise<{ ok: boolean; points: string[]; error: string | null }>;
}

// 本棚の本をタップすると、AIが「かんたん要約(箇条書き)」を出す一覧。
// 一度取得した要約は開いている間キャッシュして再取得しない。
export function EasySummary({ books, summarizeAction }: EasySummaryProps) {
  const { showToast } = useToast();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [cache, setCache] = useState<Record<number, string[]>>({});
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const handleClick = (idx: number, b: EasyBook) => {
    // 開いているものを再タップしたら閉じる
    if (openIdx === idx) {
      setOpenIdx(null);
      return;
    }
    setOpenIdx(idx);
    if (cache[idx]) return; // 取得済みならそのまま表示
    setPendingIdx(idx);
    startTransition(async () => {
      try {
        const res = await summarizeAction(b.title, b.author);
        if (res.ok && res.points.length > 0) {
          setCache((prev) => ({ ...prev, [idx]: res.points }));
        } else {
          showToast(res.error || "要約を取得できませんでした", "info");
          setOpenIdx((cur) => (cur === idx ? null : cur));
        }
      } catch {
        showToast("要約の取得に失敗しました", "error");
        setOpenIdx((cur) => (cur === idx ? null : cur));
      } finally {
        setPendingIdx(null);
      }
    });
  };

  return (
    <ul className="space-y-3">
      {books.map((b, i) => {
        const open = openIdx === i;
        const busy = pendingIdx === i;
        const points = cache[i];
        return (
          <li key={i} className="overflow-hidden rounded-lg border border-beige-200 bg-paper">
            <button
              type="button"
              onClick={() => handleClick(i, b)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-beige-50"
            >
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-beige-100">
                {b.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-beige-300">
                    <BookOpen size={18} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{b.title}</p>
                {b.author && <p className="truncate text-sm text-ink/50">{b.author}</p>}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-forest-700">
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                {!points && !busy && <span>要約</span>}
                <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
              </span>
            </button>
            {open && (
              <div className="border-t border-beige-200 bg-beige-50/60 px-4 py-3">
                {busy && !points ? (
                  <p className="flex items-center gap-2 text-sm text-ink/60">
                    <Loader2 size={14} className="animate-spin" />
                    AIが要約しています…
                  </p>
                ) : points ? (
                  <ul className="space-y-2">
                    {points.map((p, j) => (
                      <li key={j} className="flex gap-2 text-sm leading-relaxed text-ink/80">
                        <span className="mt-0.5 text-forest-600">●</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
