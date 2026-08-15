import { createClient } from "@/lib/supabase/server";
import type { PersonalGoal, GoalMessage, Profile } from "@/types/database";

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
  const { data } = await supabase.from("personal_goals").select("*").eq("id", goalId).maybeSingle();
  if (!data) return null;
  const goal = data as PersonalGoal;

  const { data: owner } = await supabase.from("profiles").select("*").eq("id", goal.user_id).maybeSingle();
  return { ...goal, owner: (owner as Profile) ?? undefined };
}

export async function getGoalMessages(goalId: string): Promise<GoalMessage[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("goal_messages")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: true });
  const messages = (data ?? []) as GoalMessage[];
  if (messages.length === 0) return [];

  const senderIds = Array.from(new Set(messages.map((m) => m.sender_id)));
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", senderIds);
  const byId = new Map((profiles ?? []).map((p: any) => [p.id as string, p as Profile]));
  return messages.map((m) => ({ ...m, sender: byId.get(m.sender_id) }));
}
