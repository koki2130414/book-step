import { createClient } from "@/lib/supabase/server";
import type { Genre } from "@/types/database";

export async function getActiveGenres(): Promise<Genre[]> {
  const supabase = createClient();
  const { data } = await supabase.from("genres").select("*").eq("is_active", true).order("sort_order");
  return (data ?? []) as Genre[];
}
