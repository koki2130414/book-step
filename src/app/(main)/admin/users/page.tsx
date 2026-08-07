import { createClient } from "@/lib/supabase/server";
import { UserRowActions } from "@/components/admin/user-row-actions";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
  if (searchParams.q) {
    query = query.or(`username.ilike.%${searchParams.q}%,display_name.ilike.%${searchParams.q}%`);
  }
  const { data: users } = await query;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold text-ink">ユーザー管理</h1>
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="ユーザー名・表示名で検索"
          className="h-10 flex-1 rounded-md border border-beige-300 px-3 text-sm"
        />
        <button className="rounded-md bg-forest-600 px-4 text-sm text-paper">検索</button>
      </form>
      <ul className="divide-y divide-beige-200 rounded-lg border border-beige-200">
        {(users ?? []).map((u) => (
          <li key={u.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-ink">{u.display_name} <span className="text-ink/40">@{u.username}</span></p>
              <p className="text-xs text-ink/40">{u.role} ・ {u.status}</p>
            </div>
            <UserRowActions userId={u.id} status={u.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
