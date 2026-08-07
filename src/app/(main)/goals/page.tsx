import { GoalForm } from "@/components/profile/goal-form";
import { getCurrentProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";

export default async function GoalsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = createClient();
  const { data: goals } = await supabase.from("reading_goals").select("*").eq("user_id", profile.id);

  return (
    <div className="mx-auto max-w-md space-y-8">
      <h1 className="font-display text-xl font-bold text-ink">読書目標</h1>

      {goals && goals.length > 0 && (
        <ul className="space-y-2">
          {goals.map((g) => (
            <li key={g.id} className="rounded-md border border-beige-200 p-3 text-sm">
              {g.goal_type === "monthly" ? `${g.target_year}年${g.target_month}月` : `${g.target_year}年`}: 目標 {g.target_count}冊
            </li>
          ))}
        </ul>
      )}

      <GoalForm />
    </div>
  );
}
