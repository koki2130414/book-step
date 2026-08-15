import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

// ログイン中ユーザーのプロフィールを取得(未ログインならnull)
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*").eq("username", username).single();
  return data as Profile | null;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}

export async function getProfileStats(userId: string) {
  const supabase = createClient();
  const [{ count: finishedCount }, { count: readingCount }, { count: friendCount }] = await Promise.all([
    supabase
      .from("reading_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reading_status", "finished"),
    supabase
      .from("reading_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reading_status", "reading"),
    // 登録者は全員友達なので、友達数は「自分以外の登録ユーザー数」
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return {
    finishedCount: finishedCount ?? 0,
    readingCount: readingCount ?? 0,
    friendCount: Math.max(0, (friendCount ?? 1) - 1),
  };
}
