"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { EyeOff, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/components/ui/toast-provider";
import { hideUser, unhideUser } from "@/app/(main)/friends/actions";
import type { Profile } from "@/types/database";

export function FriendManageList({ users, mode }: { users: Profile[]; mode: "friends" | "hidden" }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const visible = users.filter((u) => !removed.has(u.id));
  if (visible.length === 0) {
    return (
      <EmptyState
        title={mode === "friends" ? "表示できる友達がいません" : "非表示のユーザーはいません"}
        description={mode === "friends" ? "BOOK STEPに登録している人が友達として表示されます。" : undefined}
      />
    );
  }

  const toggle = (id: string) => {
    startTransition(async () => {
      try {
        if (mode === "friends") {
          await hideUser(id);
          showToast("非表示にしました");
        } else {
          await unhideUser(id);
          showToast("再表示しました");
        }
        setRemoved((prev) => new Set(prev).add(id));
      } catch (e) {
        showToast(e instanceof Error ? e.message : "操作に失敗しました", "error");
      }
    });
  };

  return (
    <ul className="space-y-2">
      {visible.map((u) => (
        <li key={u.id} className="flex items-center justify-between rounded-md border border-beige-200 p-3">
          <Link href={`/profile/${u.username}`} className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={u.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{u.display_name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-ink">{u.display_name}</p>
              <p className="text-xs text-ink/50">@{u.username}</p>
            </div>
          </Link>
          <Button
            size="sm"
            variant={mode === "friends" ? "outline" : "secondary"}
            disabled={isPending}
            onClick={() => toggle(u.id)}
          >
            {mode === "friends" ? (
              <>
                <EyeOff size={14} /> 非表示
              </>
            ) : (
              <>
                <Eye size={14} /> 表示
              </>
            )}
          </Button>
        </li>
      ))}
    </ul>
  );
}
