"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendFriendRequest(addresseeId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") throw new Error("既に申請済みです");
    throw new Error(`申請に失敗しました: ${error.message}`);
  }

  // 通知を作成(相手に「友達申請が届いた」を通知)
  await supabase.from("notifications").insert({
    user_id: addresseeId,
    actor_id: user.id,
    type: "friend_request",
    message: "友達申請が届きました",
  });

  revalidatePath("/friends");
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: friendship, error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "rejected" })
    .eq("id", friendshipId)
    .select("requester_id")
    .single();
  if (error) throw new Error(`処理に失敗しました: ${error.message}`);

  if (accept && friendship) {
    await supabase.from("notifications").insert({
      user_id: friendship.requester_id,
      actor_id: user.id,
      type: "friend_accepted",
      message: "友達申請が承認されました",
    });
  }

  revalidatePath("/friends");
  revalidatePath("/friends/requests");
}

export async function removeFriendship(friendshipId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw new Error(`解除に失敗しました: ${error.message}`);
  revalidatePath("/friends");
}

// ユーザーを非表示にする(自分のフィード/友達一覧から見えなくする。方向性あり)
export async function hideUser(hiddenUserId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("hidden_users")
    .upsert({ user_id: user.id, hidden_user_id: hiddenUserId }, { onConflict: "user_id,hidden_user_id" });
  if (error) throw new Error(`非表示に失敗しました: ${error.message}`);
  revalidatePath("/friends");
  revalidatePath("/home");
}

// 非表示を解除する
export async function unhideUser(hiddenUserId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("hidden_users")
    .delete()
    .eq("user_id", user.id)
    .eq("hidden_user_id", hiddenUserId);
  if (error) throw new Error(`再表示に失敗しました: ${error.message}`);
  revalidatePath("/friends");
  revalidatePath("/home");
}
