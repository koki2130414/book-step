"use client";
import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/components/ui/toast-provider";
import { respondToFriendRequest } from "@/app/(main)/friends/actions";
import type { Friendship } from "@/types/database";

export function FriendRequestList({ requests }: { requests: Friendship[] }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (requests.length === 0) {
    return <EmptyState title="届いている友達申請はありません" />;
  }

  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li key={r.id} className="flex items-center justify-between rounded-md border border-beige-200 p-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={r.requester?.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{r.requester?.display_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-ink">{r.requester?.display_name}</p>
              <p className="text-xs text-ink/50">@{r.requester?.username}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await respondToFriendRequest(r.id, true);
                  showToast("友達申請を承認しました");
                })
              }
            >
              <Check size={14} /> 承認
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await respondToFriendRequest(r.id, false);
                  showToast("友達申請を拒否しました", "info");
                })
              }
            >
              <X size={14} /> 拒否
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
