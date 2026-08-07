import { createClient } from "@/lib/supabase/server";
import type { NotificationItem } from "@/types/database";

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as unknown as NotificationItem[];
}
