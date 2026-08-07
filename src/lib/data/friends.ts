import { createClient } from "@/lib/supabase/server";
import type { Friendship, Profile } from "@/types/database";

// 承認済みの友達一覧(自分視点で相手のprofileを返す)
export async function getFriendsList(userId: string): Promise<Profile[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("friendships")
    .select("requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*), requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (!data) return [];
  return data.map((row: any) => (row.requester_id === userId ? row.addressee : row.requester));
}

// 自分宛の承認待ち申請
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

// 登録メンバー一覧(ページネーション付き)。新しく登録した順に表示する
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
