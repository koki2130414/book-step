import Link from "next/link";
import { PlusCircle, Target, Flame, BarChart3, Feather, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/books/book-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentProfile } from "@/lib/data/profile";
import { getHomeFeed, getMyShelf, getRecommendedBooks } from "@/lib/data/reading-posts";
import { getMyGoals } from "@/lib/data/goals";
import { getReadingActivity } from "@/lib/data/reading-activity";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { MonthlyGoalControl } from "@/components/goals/monthly-goal-control";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [feed, myShelf, recommended] = await Promise.all([
    getHomeFeed(profile.id),
    getMyShelf(profile.id),
    getRecommendedBooks(profile.id),
  ]);
  const currentlyReading = myShelf.filter((p) => p.reading_status === "reading");
  const goals = await getMyGoals(profile.id);
  const activity = await getReadingActivity(profile.id);

  // リマインダー(アプリ内): オンで、設定時刻を過ぎていて、今日まだ読んでいない時だけ声かけ
  const jstHour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", hour: "numeric", hourCycle: "h23" }).format(new Date()),
  );
  const showNudge =
    (profile.reminder_enabled ?? false) && !activity.readToday && jstHour >= (profile.reminder_hour ?? 20);

  const supabase = createClient();
  const { data: goal } = await supabase
    .from("reading_goals")
    .select("*")
    .eq("user_id", profile.id)
    .eq("goal_type", "monthly")
    .eq("target_year", new Date().getFullYear())
    .eq("target_month", new Date().getMonth() + 1)
    .maybeSingle();

  // 今月の目標の冊数を自分で増減するサーバーアクション。確定後の冊数を返す
  async function adjustMonthlyGoal(delta: number): Promise<number> {
    "use server";
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) throw new Error("ログインが必要です");
    const now = new Date();
    const { data: g } = await sb
      .from("reading_goals")
      .select("id, current_count")
      .eq("user_id", user.id)
      .eq("goal_type", "monthly")
      .eq("target_year", now.getFullYear())
      .eq("target_month", now.getMonth() + 1)
      .maybeSingle();
    if (!g) return 0;
    const next = Math.max(0, (g.current_count ?? 0) + delta);
    await sb.from("reading_goals").update({ current_count: next }).eq("id", g.id).eq("user_id", user.id);
    revalidatePath("/home");
    return next;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink/50">おかえりなさい</p>
          <h1 className="font-display text-xl font-bold text-ink">{profile.display_name}さん</h1>
          {activity.streakDays > 0 && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-beige-100 px-2.5 py-0.5 text-xs font-medium text-clay-500">
              <Flame size={12} className="text-clay-600" />
              {activity.streakDays}日連続で読書中
            </span>
          )}
        </div>
        <Button asChild>
          <Link href="/books/new">
            <PlusCircle size={18} /> 本を登録する
          </Link>
        </Button>
      </div>

      {/* リマインダー(アプリ内の声かけ) */}
      {showNudge && (
        <Link
          href="/easy"
          className="flex items-center justify-between gap-3 rounded-lg border border-forest-100 bg-forest-50/60 p-4 transition-colors hover:bg-forest-50"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-100 text-forest-600">
              <Feather size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">今日はまだ読んでいません</p>
              <p className="text-xs text-ink/60">5分だけ読んでみませんか？</p>
            </div>
          </div>
          <ChevronRight size={18} className="shrink-0 text-forest-600" />
        </Link>
      )}

      {/* 読書目標の進捗 */}
      <section className="rounded-lg border border-beige-200 bg-beige-50/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-forest-700">
            <Target size={16} /> 今月の読書目標
          </div>
          <Link href="/goals" className="text-xs text-forest-700 hover:underline">
            {goal ? "編集する" : "設定する"}
          </Link>
        </div>
        {goal ? (
          <MonthlyGoalControl
            initialCount={goal.current_count ?? 0}
            target={goal.target_count}
            adjustAction={adjustMonthlyGoal}
          />
        ) : (
          <p className="text-sm text-ink/60">
            まだ目標が設定されていません。
            <Link href="/goals" className="ml-1 text-forest-700 hover:underline">目標を設定する</Link>
          </p>
        )}
      </section>

      {/* 今月の読書レポートへの導線 */}
      <Link
        href="/report"
        className="flex items-center justify-between gap-3 rounded-lg border border-beige-200 p-4 transition-colors hover:bg-beige-50"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-100 text-forest-600">
            <BarChart3 size={18} />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">今月の読書レポート</p>
            <p className="text-xs text-ink/60">AIが今月の読書をふり返り、来月を提案します</p>
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-ink/40" />
      </Link>

      {/* 個人目標 */}
      {goals.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">目標</h2>
            <Link href="/goals" className="text-xs text-forest-700 hover:underline">すべて見る</Link>
          </div>
          <ul className="space-y-3">
            {goals.slice(0, 3).map((g) => (
              <li key={g.id} className="space-y-2 rounded-lg border border-beige-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/goals/${g.id}`} className="font-display font-semibold text-ink hover:underline">
                    {g.title}
                  </Link>
                  <span className="shrink-0 text-xs text-ink/50">{g.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-beige-200">
                  <div className="h-full rounded-full bg-forest-600" style={{ width: `${g.progress}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 現在読んでいる本 */}
      {currentlyReading.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">現在読んでいる本</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {currentlyReading.map((post) => (
              <BookCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* おすすめの本 */}
      {recommended.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">おすすめの本</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recommended.map((post) => (
              <BookCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* 友達・新着の投稿 */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">新着の投稿</h2>
        {feed.length === 0 ? (
          <EmptyState
            title="まだ投稿がありません"
            description="友達を追加するか、最初の一冊を登録してみましょう。"
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/books/new">本を登録する</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {feed.map((post) => (
              <BookCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
