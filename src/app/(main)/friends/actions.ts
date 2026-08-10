"use server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// 通知の作成はRLSでクライアント権限からのinsertを禁止しているため、
// サーバー側(service role)で作成する。失敗しても本処理は継続する(ベストエフォート)。
async function createNotification(params: {
  userId: string;
  actorId: string;
  type: string;
  message: string;
}) {
  try {
    const admin = createServiceRoleClient();
    await admin.from("notifications").insert({
      user_id: params.userId,
      actor_id: params.actorId,
      type: params.type,
      message: params.message,
    });
  } catch (e) {
    console.error("通知の作成に失敗しました", e);
  }
}

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
  await createNotification({
    userId: addresseeId,
    actorId: user.id,
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
    await createNotification({
      userId: friendship.requester_id,
      actorId: user.id,
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
