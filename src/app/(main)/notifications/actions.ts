"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string) {
  const supabase = createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  revalidatePath("/notifications");
}
