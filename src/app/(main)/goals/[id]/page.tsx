import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCurrentProfile } from "@/lib/data/profile";
import { getGoalById, getGoalMessages } from "@/lib/data/goals";
import {
  GoalProgressControl,
  GoalDeleteButton,
  GoalMessageForm,
} from "@/components/goals/goal-client";

function deadlineLabel(deadline: string | null): string {
  if (!deadline) return "期限なし";
  const d = new Date(deadline + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  if (diff < 0) return `${dateStr}（期限切れ）`;
  if (diff === 0) return `${dateStr}（今日まで）`;
  return `${dateStr}（あと${diff}日）`;
}

export default async function GoalDetailPage({ params }: { params: { id: string } }) {
  const me = await getCurrentProfile();
  if (!me) return null;

  const goal = await getGoalById(params.id);
  if (!goal) notFound();

  const isOwner = goal.user_id === me.id;
  const messages = await getGoalMessages(goal.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/goals" className="text-sm text-forest-700 hover:underline">
        ← 目標一覧へ
      </Link>

      <div className="space-y-3 rounded-lg border border-beige-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">{goal.title}</h1>
            <p className="text-xs text-ink/50">{deadlineLabel(goal.deadline)}</p>
          </div>
          {goal.status === "achieved" && (
            <span className="shrink-0 rounded-full bg-forest-600 px-2 py-0.5 text-xs text-paper">達成</span>
          )}
        </div>

        {goal.owner && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={goal.owner.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-[10px]">{goal.owner.display_name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-ink/70">{goal.owner.display_name}</span>
          </div>
        )}

        {goal.description && <p className="whitespace-pre-wrap text-sm text-ink/70">{goal.description}</p>}

        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-beige-200">
            <div className="h-full rounded-full bg-forest-600" style={{ width: `${goal.progress}%` }} />
          </div>
          {!isOwner && <p className="text-sm font-medium text-ink">{goal.progress}%</p>}
        </div>

        {isOwner && (
          <>
            <GoalProgressControl goalId={goal.id} initialProgress={goal.progress} />
            <div className="flex justify-end">
              <GoalDeleteButton goalId={goal.id} />
            </div>
          </>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="font-display font-semibold text-ink">応援メッセージ</h2>

        {!isOwner && <GoalMessageForm goalId={goal.id} />}

        {messages.length === 0 ? (
          <p className="text-sm text-ink/50">まだメッセージはありません。</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className="flex gap-3 rounded-lg border border-beige-200 p-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={m.sender?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="text-xs">{m.sender?.display_name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <p className="text-xs text-ink/50">{m.sender?.display_name ?? "ユーザー"}</p>
                  <p className="whitespace-pre-wrap text-sm text-ink/80">{m.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
