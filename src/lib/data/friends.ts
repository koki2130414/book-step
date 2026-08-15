import { createClient } from "@/lib/supabase/server";
import type { Friendship, Profile } from "@/types/database";

// 友達一覧(全登録ユーザーのうち、自分と「自分が非表示にした人」を除く)
export async function getFriendsList(userId: string): Promise<Profile[]> {
  const supabase = createClient();
  const { data: hidden } = await supabase.from("hidden_users").select("hidden_user_id").eq("user_id", userId);
  const hiddenSet = new Set((hidden ?? []).map((h: any) => h.hidden_user_id as string));
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", userId)
    .order("display_name", { ascending: true });
  return ((data ?? []) as Profile[]).filter((p) => !hiddenSet.has(p.id));
}

// 自分が非表示にしているユーザー一覧
export async function getHiddenProfiles(userId: string): Promise<Profile[]> {
  const supabase = createClient();
  const { data: hidden } = await supabase.from("hidden_users").select("hidden_user_id").eq("user_id", userId);
  const ids = (hidden ?? []).map((h: any) => h.hidden_user_id as string);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids)
    .order("display_name", { ascending: true });
  return (data ?? []) as Profile[];
}

// 自分が非表示にしたユーザーのIDリスト
export async function getHiddenIds(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase.from("hidden_users").select("hidden_user_id").eq("user_id", userId);
  return (data ?? []).map((h: any) => h.hidden_user_id as string);
}

// 自分宛の承認待ち申請(後方互換のため残置。現在の友達モデルでは未使用)
export async function getPendingRequests(userId: string): Promise<Friendship[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("friendships")
    .select("*, requester:profiles!friendships_requester_id_fkey(*)")
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as Friendship[];
}

export async function getFriendshipStatus(userId: string, otherUserId: string): Promise<Friendship | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`,
    )
    .maybeSingle();
  return data as Friendship | null;
}

export async function searchUsers(query: string, excludeUserId: string): Promise<Profile[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq("id", excludeUserId)
    .limit(20);
  return (data ?? []) as Profile[];
}

// ユーザー名(=ユーザーID)からプロフィールを1件取得する。QRコード/ID直接指定での友達追加に使用
export async function getProfileByUsernameExact(username: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  return data as Profile | null;
}

// 登録メンバーダー一覧(ページネーション付き)。新しく登録した順に表示する
export async function getAllMembers(
  excludeUserId: string,
  limit: number,
  offset: number,
): Promise<{ members: Profile[]; hasMore: boolean }> {
  const supabase = createClient();
  const { data, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .neq("id", excludeUserId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const members = (data ?? []) as Profile[];
  const hasMore = (count ?? 0) > offset + members.length;
  return { members, hasMore };
}
