import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";

// 管理画面共通ガード。RLS側でも管理者判定を行うため二重の防御になる
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/home");
  }
  return <div className="space-y-6">{children}</div>;
}
