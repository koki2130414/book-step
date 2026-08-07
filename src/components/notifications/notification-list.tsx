"use client";
import Link from "next/link";
import { useTransition } from "react";
import { Heart, MessageCircle, UserPlus, UserCheck, BookOpen, Target } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { markNotificationRead, markAllNotificationsRead } from "@/app/(main)/notifications/actions";
import { Button } from "@/components/ui/button";
import type { NotificationItem } from "@/types/database";

const ICON: Record<string, React.ElementType> = {
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  post_liked: Heart,
  post_commented: MessageCircle,
  friend_new_book: BookOpen,
  goal_achieved: Target,
};

function linkFor(n: NotificationItem): string {
  if (n.reading_post_id) return `/books/${n.reading_post_id}`;
  if (n.type === "friend_request" || n.type === "friend_accepted") return "/friends";
  return "#";
}

export function NotificationList({ notifications, userId }: { notifications: NotificationItem[]; userId: string }) {
  const [isPending, startTransition] = useTransition();

  if (notifications.length === 0) {
    return <EmptyState title="通知はまだありません" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => startTransition(() => markAllNotificationsRead(userId))}
        >
          すべて既読にする
        </Button>
      </div>
      <ul className="space-y-2">
        {notifications.map((n) => {
          const Icon = ICON[n.type] ?? Heart;
          return (
            <li key={n.id}>
              <Link
                href={linkFor(n)}
                onClick={() => !n.is_read && startTransition(() => markNotificationRead(n.id))}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 transition-colors",
                  n.is_read ? "border-beige-200 bg-paper" : "border-forest-200 bg-forest-50",
                )}
              >
                <span className="rounded-full bg-beige-100 p-2 text-forest-600"><Icon size={16} /></span>
                <div className="flex-1">
                  <p className="text-sm text-ink">
                    {n.actor && <span className="font-medium">{n.actor.display_name} </span>}
                    {n.message}
                  </p>
                  <p className="text-xs text-ink/40">{formatDate(n.created_at)}</p>
                </div>
                {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" aria-label="未読" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
