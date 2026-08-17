"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// メッセージ(テキスト and/or 本のおすすめ)を相手に送る
export async function sendMessage(
  recipientId: string,
  content: string,
  bookId?: string | null,
): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "ログインが必要です" };

  const text = (content ?? "").trim();
  if (!text && !bookId) return { ok: false, message: "内容がありません" };
  if (recipientId === user.id) return { ok: false, message: "自分には送れません" };

  const { error } = await supabase.from("direct_messages").insert({
    sender_id: user.id,
    recipient_id: recipientId,
    content: text || null,
    book_id: bookId || null,
  });
  if (error) return { ok: false, message: "送信に失敗しました" };

  revalidatePath("/messages");
  revalidatePath(`/messages/${recipientId}`);
  return { ok: true, message: "送信しました" };
}

// 会話を開いたとき、相手から届いた未読メッセージを既読にする
export async function markConversationRead(partnerId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .eq("sender_id", partnerId)
    .is("read_at", null);
}
