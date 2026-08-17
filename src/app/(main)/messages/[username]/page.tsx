import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { getProfileByUsernameExact } from "@/lib/data/friends";
import { getMyShelf } from "@/lib/data/reading-posts";
import { createClient } from "@/lib/supabase/server";
import { ChatThread } from "@/components/messages/chat-thread";
import { markConversationRead } from "../actions";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: { username: string } }) {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const partner = await getProfileByUsernameExact(params.username);
  if (!partner || partner.id === me.id) notFound();

  const supabase = createClient();
  const { data: msgs } = await supabase
    .from("direct_messages")
    .select(
      "id, sender_id, recipient_id, content, book_id, created_at, book:books(id, title, author, cover_image_url)",
    )
    .or(
      `and(sender_id.eq.${me.id},recipient_id.eq.${partner.id}),and(sender_id.eq.${partner.id},recipient_id.eq.${me.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(300);

  // 相手からの未読を既読にする
  await markConversationRead(partner.id);

  // 「本をすすめる」ピッカー用に、自分の本棚の本(重複排除)を渡す
  const shelf = await getMyShelf(me.id);
  const seen = new Set<string>();
  const shelfBooks = shelf
    .map((p) => {
      const b = (p as { book?: { id?: string; title?: string; author?: string } }).book;
      return { id: b?.id ?? "", title: b?.title ?? "", author: b?.author ?? "" };
    })
    .filter((b) => {
      if (!b.id || !b.title || seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

  return (
    <ChatThread
      meId={me.id}
      partner={{ id: partner.id, username: partner.username, displayName: partner.display_name }}
      initialMessages={(msgs ?? []) as never[]}
      shelfBooks={shelfBooks}
    />
  );
}
