import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, BookOpen } from "lucide-react";
import { getCurrentProfile } from "@/lib/data/profile";
import { getFriendsList } from "@/lib/data/friends";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Row {
  sender_id: string;
  recipient_id: string;
  content: string | null;
  book_id: string | null;
  created_at: string;
  read_at: string | null;
}

export default async function MessagesPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const supabase = createClient();
  const { data: msgs } = await supabase
    .from("direct_messages")
    .select("sender_id, recipient_id, content, book_id, created_at, read_at")
    .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`)
    .order("created_at", { ascending: false })
    .limit(500);

  // 相手ごとに最新メッセージと未読件数を集計する
  const byPartner = new Map<string, { last: Row; unread: number }>();
  for (const m of (msgs ?? []) as Row[]) {
    const pid = m.sender_id === me.id ? m.recipient_id : m.sender_id;
    if (!byPartner.has(pid)) byPartner.set(pid, { last: m, unread: 0 });
    const rec = byPartner.get(pid)!;
    if (m.recipient_id === me.id && !m.read_at) rec.unread += 1;
  }

  const partnerIds = [...byPartner.keys()];
  const profMap = new Map<string, { id: string; username: string; display_name: string }>();
  if (partnerIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", partnerIds);
    for (const p of (data ?? []) as { id: string; username: string; display_name: string }[]) {
      profMap.set(p.id, p);
    }
  }

  const conversations = partnerIds
    .map((pid) => ({ partner: profMap.get(pid), ...byPartner.get(pid)! }))
    .filter((c) => c.partner);

  const members = (await getFriendsList(me.id)).filter((p) => !byPartner.has(p.id)).slice(0, 30);

  const preview = (r: Row) => (r.content ? r.content : r.book_id ? "本のおすすめ" : "");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
        <MessageCircle size={22} className="text-forest-600" />
        メッセージ
      </h1>

      {conversations.length > 0 && (
        <ul className="divide-y divide-beige-200 overflow-hidden rounded-lg border border-beige-200">
          {conversations.map((c) => (
            <li key={c.partner!.id}>
              <Link
                href={`/messages/${c.partner!.username}`}
                className="flex items-center gap-3 p-3 hover:bg-beige-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-beige-100 font-display text-sm text-forest-700">
                  {c.partner!.display_name?.charAt(0) ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{c.partner!.display_name}</p>
                  <p className="flex items-center gap-1 truncate text-sm text-ink/50">
                    {c.last.book_id && <BookOpen size={12} className="shrink-0" />}
                    {preview(c.last)}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-600 px-1.5 text-[11px] text-paper">
                    {c.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink/60">新しくメッセージを送る</h2>
        {members.length === 0 ? (
          <p className="text-sm text-ink/40">送れる相手がいません。</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {members.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/messages/${p.username}`}
                  className="flex items-center gap-2 rounded-full border border-beige-300 px-3 py-1.5 text-sm text-ink/70 hover:bg-beige-50"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-beige-100 text-xs text-forest-700">
                    {p.display_name?.charAt(0) ?? "?"}
                  </span>
                  {p.display_name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
