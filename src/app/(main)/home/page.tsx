import Link from "next/link";
import { PlusCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/books/book-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentProfile } from "@/lib/data/profile";
import { getHomeFeed, getMyShelf, getRecommendedBooks } from "@/lib/data/reading-posts";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [feed, myShelf, recommended] = await Promise.all([
    getHomeFeed(profile.id),
    getMyShelf(profile.id),
    getRecommendedBooks(profile.id),
  ]);
  const currentlyReading = myShelf.filter((p) => p.reading_status === "reading");

  const supabase = createClient();
  const { data: goal } = await supabase
    .from("reading_goals")
    .select("*")
    .eq("user_id", profile.id)
    .eq("goal_type", "monthly")
    .eq("target_year", new Date().getFullYear())
    .eq("target_month", new Date().getMonth() + 1)
    .maybeSingle();

  const finishedThisMonth = myShelf.filter((p) => {
    if (!p.finished_at) return false;
    const d = new Date(p.finished_at);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink/50">おかえりなさい</p>
          <h1 className="font-display text-xl font-bold text-ink">{profile.display_name}さん</h1>
        </div>
        <Button asChild>
          <Link href="/books/new">
            <PlusCircle size={18} /> 本を登録する
          </Link>
        </Button>
      </div>

      {/* 読書目標の進捗 */}
      <section className="rounded-lg border border-beige-200 bg-beige-50/60 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-forest-700">
          <Target size={16} /> 今月の読書目標
        </div>
        {goal ? (
          <div>
            <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-beige-200">
              <div
                className="h-full bg-forest-600"
                style={{ width: `${Math.min(100, (finishedThisMonth / goal.target_count) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-ink/60">{finishedThisMonth} / {goal.target_count} 冊</p>
          </div>
        ) : (
          <p className="text-sm text-ink/60">
            まだ目標が設定されていません。
            <Link href="/goals" className="ml-1 text-forest-700 hover:underline">目標を設定する</Link>
          </p>
        )}
      </section>

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
