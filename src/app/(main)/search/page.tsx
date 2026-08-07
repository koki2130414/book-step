"use client";
import { useState, useTransition } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookCard } from "@/components/books/book-card";
import { BookCardSkeleton } from "@/components/shared/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type { ReadingPost } from "@/types/database";

const STATUS_OPTIONS = [
  { value: "all", label: "すべてのステータス" },
  { value: "want_to_read", label: "読みたい" },
  { value: "reading", label: "読書中" },
  { value: "finished", label: "読了" },
  { value: "paused", label: "中断" },
  { value: "reread_wanted", label: "再読したい" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [results, setResults] = useState<ReadingPost[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const runSearch = () => {
    startTransition(async () => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/search?${params.toString()}`);
      const json = await res.json();
      setResults(json.posts ?? []);
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">本を検索する</h1>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="タイトル・著者名・感想・学びなどで検索"
          aria-label="検索キーワード"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={runSearch} disabled={isPending}>
          <SearchIcon size={16} /> 検索
        </Button>
      </div>

      {isPending && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <BookCardSkeleton key={i} />)}
        </div>
      )}

      {!isPending && results !== null && (
        results.length === 0 ? (
          <EmptyState title="該当する本が見つかりませんでした" description="キーワードを変えて再度検索してみてください。" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((post) => <BookCard key={post.id} post={post} />)}
          </div>
        )
      )}
    </div>
  );
}
