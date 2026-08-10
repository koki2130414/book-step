"use client";
import { useState, useTransition } from "react";
import { Search, UserPlus, Check, Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast-provider";
import { sendFriendRequest } from "@/app/(main)/friends/actions";
import type { Profile, FriendshipStatus } from "@/types/database";

interface UserResult extends Profile {
  friendshipStatus: FriendshipStatus | null;
}

export function FriendSearch() {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  // 申請ボタンを押してからサーバーの応答が返るまでの間、ボタンを無効化しローディング表示を出すための状態
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());

  const runSearch = () => {
    if (!query.trim()) return;
    startTransition(async () => {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setResults(json.users ?? []);
    });
  };

  const handleRequest = async (userId: string) => {
    if (submittingIds.has(userId)) return; // 二重送信を防止
    setSubmittingIds((prev) => new Set(prev).add(userId));
    try {
      await sendFriendRequest(userId);
      setSentTo((prev) => new Set(prev).add(userId));
      showToast("友達申請を送りました");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "申請に失敗しました", "error");
    } finally {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="ユーザー名または表示名で検索"
          aria-label="ユーザー検索"
        />
        <Button onClick={runSearch} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
        </Button>
      </div>

      {results && (
        <ul className="space-y-2">
          {results.map((u) => {
            const alreadySent = sentTo.has(u.id) || u.friendshipStatus === "pending";
            const isFriend = u.friendshipStatus === "accepted";
            const isSubmitting = submittingIds.has(u.id);
            return (
              <li key={u.id} className="flex items-center justify-between rounded-md border border-beige-200 p-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={u.avatar_url ?? undefined} alt="" />
                    <AvatarFallback>{u.display_name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-ink">{u.display_name}</p>
                    <p className="text-xs text-ink/50">@{u.username}</p>
                  </div>
                </div>
                {isFriend ? (
                  <span className="flex items-center gap-1 text-xs text-forest-700"><Check size={14} /> 友達</span>
                ) : alreadySent ? (
                  <span className="flex items-center gap-1 text-xs text-ink/40"><Clock size={14} /> 申請中</span>
                ) : (
                  <Button size="sm" variant="secondary" disabled={isSubmitting} onClick={() => handleRequest(u.id)}>
                    {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
                    申請する
                  </Button>
                )}
              </li>
            );
          })}
          {results.length === 0 && <p className="text-sm text-ink/50">該当するユーザーが見つかりませんでした。</p>}
        </ul>
      )}
    </div>
  );
}
