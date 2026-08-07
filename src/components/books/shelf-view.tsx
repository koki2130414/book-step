"use client";
import { useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookCard } from "@/components/books/book-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { ReadingPost } from "@/types/database";

const TABS = [
  { value: "all", label: "すべて" },
  { value: "want_to_read", label: "読みたい" },
  { value: "reading", label: "読書中" },
  { value: "finished", label: "読了" },
  { value: "paused", label: "中断" },
  { value: "favorite", label: "お気に入り" },
];

const SORT_OPTIONS = [
  { value: "created_desc", label: "登録が新しい順" },
  { value: "finished_desc", label: "読了日が新しい順" },
  { value: "rating_desc", label: "おすすめ度が高い順" },
  { value: "title_asc", label: "タイトル順" },
];

export function ShelfView({ posts }: { posts: ReadingPost[] }) {
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("created_desc");
  const [view, setView] = useState<"grid" | "list">("list");

  const filtered = useMemo(() => {
    let result = posts;
    if (tab === "favorite") result = result.filter((p) => p.is_favorite);
    else if (tab !== "all") result = result.filter((p) => p.reading_status === tab);

    return [...result].sort((a, b) => {
      switch (sort) {
        case "finished_desc":
          return (b.finished_at ?? "").localeCompare(a.finished_at ?? "");
        case "rating_desc":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "title_asc":
          return (a.book?.title ?? "").localeCompare(b.book?.title ?? "", "ja");
        default:
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      }
    });
  }, [posts, tab, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-md border border-beige-300">
            <button
              type="button"
              aria-label="グリッド表示"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={cn("p-2", view === "grid" && "bg-beige-100")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              aria-label="リスト表示"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={cn("p-2", view === "list" && "bg-beige-100")}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="この条件の本はまだありません" description="別のタブを見るか、新しい本を登録してみましょう。" />
      ) : (
        <div className={view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : "flex flex-col gap-3"}>
          {filtered.map((post) => (
            <BookCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
