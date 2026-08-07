"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";

async function assertAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") throw new Error("管理者権限が必要です");
  return profile;
}

export async function suspendUser(userId: string, suspend: boolean) {
  await assertAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ status: suspend ? "suspended" : "active" }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function hidePost(postId: string, hide: boolean) {
  await assertAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("reading_posts").update({ is_hidden: hide }).eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function hideComment(commentId: string, hide: boolean) {
  await assertAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("comments").update({ is_hidden: hide }).eq("id", commentId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function resolveReport(reportId: string, status: "reviewed" | "dismissed") {
  const profile = await assertAdmin();
  const supabase = createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: profile.id })
    .eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/reports");
}

export async function upsertGenre(input: { id?: string; name: string; slug: string; sortOrder: number; isActive: boolean }) {
  await assertAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("genres").upsert({
    id: input.id,
    name: input.name,
    slug: input.slug,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/genres");
}

export async function createAnnouncement(input: { title: string; body: string }) {
  const profile = await assertAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("announcements").insert({
    title: input.title,
    body: input.body,
    is_active: true,
    published_at: new Date().toISOString(),
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/announcements");
}
