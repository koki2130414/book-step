"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  personalGoalSchema,
  goalMessageSchema,
  type PersonalGoalInput,
  type GoalMessageInput,
} from "@/lib/validations/goal";

export async function createPersonalGoal(rawInput: PersonalGoalInput) {
  const input = personalGoalSchema.parse(rawInput);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("personal_goals").insert({
    user_id: user.id,
    title: input.title,
    description: input.description || null,
    deadline: input.deadline || null,
    visibility: input.visibility,
  });
  if (error) throw new Error(`目標の作成に失敗しました: ${error.message}`);
  revalidatePath("/goals");
}

export async function updateGoalProgress(goalId: string, progress: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const { error } = await supabase
    .from("personal_goals")
    .update({ progress: clamped, status: clamped >= 100 ? "achieved" : "in_progress" })
    .eq("id", goalId)
    .eq("user_id", user.id);
  if (error) throw new Error(`進捗の更新に失敗しました: ${error.message}`);
  revalidatePath("/goals");
  revalidatePath(`/goals/${goalId}`);
}

export async function deletePersonalGoal(goalId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("personal_goals").delete().eq("id", goalId).eq("user_id", user.id);
  if (error) throw new Error(`削除に失敗しました: ${error.message}`);
  revalidatePath("/goals");
}

export async function sendGoalMessage(goalId: string, rawInput: GoalMessageInput) {
  const input = goalMessageSchema.parse(rawInput);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("goal_messages").insert({
    goal_id: goalId,
    sender_id: user.id,
    message: input.message,
  });
  if (error) throw new Error(`メッセージの送信に失敗しました: ${error.message}`);
  revalidatePath(`/goals/${goalId}`);
}
