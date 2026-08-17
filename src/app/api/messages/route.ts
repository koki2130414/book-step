import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// チャット画面のポーリング用。指定した相手との会話メッセージを新しい順→古い順で返す
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const partnerId = searchParams.get("with");
  if (!partnerId) return NextResponse.json({ messages: [], me: user.id });

  const { data } = await supabase
    .from("direct_messages")
    .select(
      "id, sender_id, recipient_id, content, book_id, created_at, book:books(id, title, author, cover_image_url)",
    )
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(300);

  return NextResponse.json({ messages: data ?? [], me: user.id });
}
