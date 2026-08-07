import { AnnouncementForm } from "@/components/admin/announcement-form";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAnnouncementsPage() {
  const supabase = createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">お知らせ配信</h1>
      <AnnouncementForm />
      <ul className="space-y-2">
        {(announcements ?? []).map((a) => (
          <li key={a.id} className="rounded-md border border-beige-200 p-3">
            <p className="text-sm font-medium text-ink">{a.title}</p>
            <p className="text-sm text-ink/70">{a.body}</p>
            <p className="text-xs text-ink/40">{formatDate(a.created_at)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
