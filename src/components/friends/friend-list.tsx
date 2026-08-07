"use client";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import type { Profile } from "@/types/database";

export function FriendList({ friends }: { friends: Profile[] }) {
  if (friends.length === 0) {
    return <EmptyState title="まだ友達がいません" description="ユーザー検索から友達を探してみましょう。" />;
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {friends.map((f) => (
        <li key={f.id}>
          <Link href={`/profile/${f.username}`} className="flex items-center gap-3 rounded-md border border-beige-200 p-3 hover:bg-beige-50">
            <Avatar>
              <AvatarImage src={f.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{f.display_name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-ink">{f.display_name}</p>
              <p className="text-xs text-ink/50">@{f.username}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
