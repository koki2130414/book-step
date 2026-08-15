import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookCard } from "@/components/books/book-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentProfile, getProfileByUsername, getProfileStats } from "@/lib/data/profile";
import { getUserGoals } from "@/lib/data/goals";
import { createClient } from "@/lib/supabase/server";

// 友達のプロフィール閲覧画面(RLSにより、公開範囲外の投稿は自動的に除外される)
export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const [me, targetProfile] = await Promise.all([getCurrentProfile(), getProfileByUsername(params.username)]);
  if (!me) return null;
  if (!targetProfile) notFound();

  const stats = await getProfileStats(targetProfile.id);
  const goals = await getUserGoals(targetProfile.id);

  const supabase = createClient();
  const { data: posts } = await supabase
    .from("reading_posts")
    .select("*, book:books(*), author_profile:profiles!reading_posts_user_id_fkey(*)")
    .eq("user_id", targetProfile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={targetProfile.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="text-xl">{targetProfile.display_name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{targetProfile.display_name}</h1>
          <p className="text-sm text-ink/50">@{targetProfile.username}</p>
        </div>
      </div>

      {targetProfile.bio && <p className="whitespace-pre-wrap text-sm text-ink/70">{targetProfile.bio}</p>}

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-beige-200 p-3">
          <p className="font-display text-lg font-bold text-ink">{stats.finishedCount}</p>
          <p className="text-xs text-ink/50">読了冊数</p>
        </div>
        <div className="rounded-lg border border-beige-200 p-3">
          <p className="font-display text-lg font-bold text-ink">{stats.readingCount}</p>
          <p className="text-xs text-ink/50">読書中</p>
        </div>
        <div className="rounded-lg border border-beige-200 p-3">
          <p className="font-display text-lg font-bold text-ink">{stats.friendCount}</p>
          <p className="text-xs text-ink/50">友達数</p>
        </div>
      </div>

      {goals.length > 0 && (
        <section>
          <h2 className="mb-3 font-display font-semibold text-ink">目標</h2>
          <ul className="space-y-3">
            {goals.map((g) => (
              <li key={g.id} className="space-y-2 rounded-lg border border-beige-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/goals/${g.id}`} className="font-display font-semibold text-ink hover:underline">
                    {g.title}
                  </Link>
                  {g.status === "achieved" && (
                    <span className="shrink-0 rounded-full bg-forest-600 px-2 py-0.5 text-xs text-paper">達成</span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-beige-200">
                  <div className="h-full rounded-full bg-forest-600" style={{ width: `${g.progress}%` }} />
                </div>
                <Link href={`/goals/${g.id}`} className="inline-block text-sm text-forest-700 hover:underline">
                  応援する →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display font-semibold text-ink">読書記録</h2>
        {!posts || posts.length === 0 ? (
          <EmptyState title="閲覧できる投稿がありません" description="非公開または友達限定の投稿は表示されません。" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(posts as any).map((post: any) => <BookCard key={post.id} post={post} />)}
          </div>
        )}
      </section>
    </div>
  );
}
