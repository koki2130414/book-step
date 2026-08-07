import { GenreForm } from "@/components/admin/genre-form";
import { createClient } from "@/lib/supabase/server";

export default async function AdminGenresPage() {
  const supabase = createClient();
  const { data: genres } = await supabase.from("genres").select("*").order("sort_order");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">ジャンル管理</h1>
      <GenreForm />
      <ul className="divide-y divide-beige-200 rounded-lg border border-beige-200">
        {(genres ?? []).map((g) => (
          <li key={g.id} className="flex items-center justify-between p-3 text-sm">
            <span>{g.name}</span>
            <span className="text-ink/40">{g.slug}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
