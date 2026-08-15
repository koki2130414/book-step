import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/profile";
import { getMyGoals } from "@/lib/data/goals";
import { createClient } from "@/lib/supabase/server";
import { GoalCreateForm, GoalProgressControl } from "@/components/goals/goal-client";
import { GoalForm } from "@/components/profile/goal-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Target } from "lucide-react";

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

export default async function GoalsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const goals = await getMyGoals(profile.id);

  const supabase = createClient();
  const { data: readingGoals } = await supabase.from("reading_goals").select("*").eq("user_id", profile.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">目標</h1>
        <p className="text-sm text-ink/50">目標と期限を決めて、進捗を記録しましょう。友達から応援メッセージが届きます。</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display font-semibold text-ink">新しい目標</h2>
        <GoalCreateForm />
      </section>

      <section className="space-y-4">
        <h2 className="font-display font-semibold text-ink">自分の目標</h2>
        {goals.length === 0 ? (
          <EmptyState
            title="まだ目標がありません"
            description="上のフォームから最初の目標を作成しましょう。"
            icon={<Target size={40} />}
          />
        ) : (
          <ul className="space-y-4">
            {goals.map((g) => (
              <li key={g.id} className="space-y-3 rounded-lg border border-beige-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/goals/${g.id}`} className="font-display font-semibold text-ink hover:underline">
                      {g.title}
                    </Link>
                    <p className="text-xs text-ink/50">{deadlineLabel(g.deadline)}</p>
                  </div>
                  {g.status === "achieved" && (
                    <span className="shrink-0 rounded-full bg-forest-600 px-2 py-0.5 text-xs text-paper">達成</span>
                  )}
                </div>
                {g.description && <p className="whitespace-pre-wrap text-sm text-ink/70">{g.description}</p>}
                <div className="h-2 w-full overflow-hidden rounded-full bg-beige-200">
                  <div className="h-full rounded-full bg-forest-600" style={{ width: `${g.progress}%` }} />
                </div>
                <GoalProgressControl goalId={g.id} initialProgress={g.progress} />
                <Link href={`/goals/${g.id}`} className="inline-block text-sm text-forest-700 hover:underline">
                  応援メッセージを見る →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 border-t border-beige-200 pt-6">
        <h2 className="font-display font-semibold text-ink">読書冊数の目標</h2>
        {readingGoals && readingGoals.length > 0 && (
          <ul className="space-y-2">
            {readingGoals.map((g) => (
              <li key={g.id} className="rounded-md border border-beige-200 p-3 text-sm">
                {g.goal_type === "monthly" ? `${g.target_year}年${g.target_month}月` : `${g.target_year}年`}: 目標 {g.target_count}冊
              </li>
            ))}
          </ul>
        )}
        <GoalForm />
      </section>
    </div>
  );
}
