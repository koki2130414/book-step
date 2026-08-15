import { createClient } from "@/lib/supabase/server";
import type { PersonalGoal, GoalMessage } from "@/types/database";

// 自分の目標一覧
export async function getMyGoals(userId: string): Promise<PersonalGoal[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("personal_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PersonalGoal[];
}

// 特定ユーザーの目標一覧(RLSにより閲覧不可のものは自動的に除外される)
export async function getUserGoals(userId: string): Promise<PersonalGoal[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("personal_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PersonalGoal[];
}

export async function getGoalById(goalId: string): Promise<PersonalGoal | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("personal_goals")
    .select("*, owner:profiles!personal_goals_user_id_fkey(*)")
    .eq("id", goalId)
    .maybeSingle();
  return (data as unknown as PersonalGoal) ?? null;
}

export async function getGoalMessages(goalId: string): Promise<GoalMessage[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("goal_messages")
    .select("*, sender:profiles!goal_messages_sender_id_fkey(*)")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as GoalMessage[];
}
