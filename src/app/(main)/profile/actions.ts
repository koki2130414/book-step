"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileEditSchema, readingGoalSchema, type ProfileEditInput, type ReadingGoalInput } from "@/lib/validations/profile";

export async function updateProfile(rawInput: ProfileEditInput) {
  const input = profileEditSchema.parse(rawInput);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName,
      bio: input.bio || null,
      favorite_genres: input.favoriteGenres ?? [],
      avatar_url: input.avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) throw new Error(`更新に失敗しました: ${error.message}`);
  revalidatePath("/profile");
  redirect("/profile");
}

export async function upsertReadingGoal(rawInput: ReadingGoalInput) {
  const input = readingGoalSchema.parse(rawInput);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("reading_goals").upsert(
    {
      user_id: user.id,
      goal_type: input.goalType,
      target_count: input.targetCount,
      target_year: input.targetYear,
      target_month: input.goalType === "monthly" ? input.targetMonth : null,
    },
    { onConflict: "user_id,goal_type,target_year,target_month" },
  );
  if (error) throw new Error(`目標の保存に失敗しました: ${error.message}`);
  revalidatePath("/home");
  revalidatePath("/goals");
}
