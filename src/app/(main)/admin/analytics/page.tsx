import { createClient } from "@/lib/supabase/server";

// KPIの簡易ダッシュボード(フェーズ2)。
// より高度な集計(週次アクティブ率など)はSupabaseのビューやRPC化を推奨。
export default async function AdminAnalyticsPage() {
  const supabase = createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: newUsers30d },
    { count: totalUsers },
    { count: totalPosts },
    { count: totalComments },
    { count: totalLikes },
    { count: pendingFriendRequests },
    { data: linkClicks },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("reading_posts").select("id", { count: "exact", head: true }),
    supabase.from("comments").select("id", { count: "exact", head: true }),
    supabase.from("likes").select("id", { count: "exact", head: true }),
    supabase.from("friendships").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("link_click_events").select("link_type"),
  ]);

  const clicksByType = (linkClicks ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.link_type] = (acc[row.link_type] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "総ユーザー数", value: totalUsers ?? 0 },
    { label: "直近30日の新規登録", value: newUsers30d ?? 0 },
    { label: "総投稿数", value: totalPosts ?? 0 },
    { label: "総コメント数", value: totalComments ?? 0 },
    { label: "総いいね数", value: totalLikes ?? 0 },
    { label: "承認待ちの友達申請数", value: pendingFriendRequests ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">データ分析(KPI)</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-beige-200 p-4 text-center">
            <p className="font-display text-2xl font-bold text-forest-700">{s.value}</p>
            <p className="text-xs text-ink/50">{s.label}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 font-display font-semibold text-ink">外部リンククリック数</h2>
        <ul className="divide-y divide-beige-200 rounded-lg border border-beige-200">
          {[
            { key: "summary", label: "要約サイト" },
            { key: "youtube", label: "YouTube" },
            { key: "amazon", label: "Amazon" },
            { key: "reference", label: "その他参考サイト" },
          ].map((item) => (
            <li key={item.key} className="flex items-center justify-between p-3 text-sm">
              <span>{item.label}</span>
              <span className="font-medium text-ink">{clicksByType[item.key] ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-ink/40">
        個人を不必要に特定しないよう、外部リンククリックはログイン状況にかかわらず集計しています。
        より詳細な継続率・読了率などの分析はフェーズ2でSupabaseのビュー/RPCとして追加拡張してください。
      </p>
    </div>
  );
}
