"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { UserPlus, Check, Clock, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/components/ui/toast-provider";
import { sendFriendRequest } from "@/app/(main)/friends/actions";
import type { Profile, FriendshipStatus } from "@/types/database";

interface MemberWithStatus extends Profile {
  friendshipStatus: FriendshipStatus | null;
}

interface MemberListProps {
  initialMembers: MemberWithStatus[];
  initialHasMore: boolean;
}

// BOOK STEPに登録している全メンバーの一覧(新規登録順)。「もっと見る」で追加読み込みする
export function MemberList({ initialMembers, initialHasMore }: MemberListProps) {
  const { showToast } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, startLoadingMore] = useTransition();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const loadMore = () => {
    startLoadingMore(async () => {
      const res = await fetch(`/api/members?offset=${members.length}`);
      const json = await res.json();
      setMembers((prev) => [...prev, ...(json.members ?? [])]);
      setHasMore(json.hasMore ?? false);
    });
  };

  const handleRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      setPendingIds((prev) => new Set(prev).add(userId));
      showToast("友達申請を送りました");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "申請に失敗しました", "error");
    }
  };

  if (members.length === 0) {
    return <EmptyState title="まだ他のメンバーが登録していません" description="友達を招待してみましょう。" />;
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {members.map((m) => {
          const alreadySent = pendingIds.has(m.id) || m.friendshipStatus === "pending";
          const isFriend = m.friendshipStatus === "accepted";
          return (
            <li key={m.id} className="flex items-center justify-between rounded-md border border-beige-200 p-3">
              <Link href={`/profile/${m.username}`} className="flex min-w-0 items-center gap-3">
                <Avatar>
                  <AvatarImage src={m.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{m.display_name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{m.display_name}</p>
                  <p className="truncate text-xs text-ink/50">@{m.username}</p>
                  {m.favorite_genres.length > 0 && (
                    <p className="truncate text-xs text-ink/40">{m.favorite_genres.join(" / ")}</p>
                  )}
                </div>
              </Link>
              {isFriend ? (
                <span className="flex shrink-0 items-center gap-1 text-xs text-forest-700"><Check size={14} /> 友達</span>
              ) : alreadySent ? (
                <span className="flex shrink-0 items-center gap-1 text-xs text-ink/40"><Clock size={14} /> 申請中</span>
              ) : (
                <Button size="sm" variant="secondary" className="shrink-0" onClick={() => handleRequest(m.id)}>
                  <UserPlus size={14} /> 申請
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? <Loader2 className="animate-spin" size={16} /> : null}
            もっと見る
          </Button>
        </div>
      )}
    </div>
  );
}
