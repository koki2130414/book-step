import Link from "next/link";
import { Users, Flag, Tag, Megaphone, BookX, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const MENU = [
  { href: "/admin/users", label: "ユーザー管理", icon: Users },
  { href: "/admin/reports", label: "通報一覧", icon: Flag },
  { href: "/admin/genres", label: "ジャンル管理", icon: Tag },
  { href: "/admin/announcements", label: "お知らせ配信", icon: Megaphone },
  { href: "/admin/analytics", label: "データ分析(KPI)", icon: BarChart3 },
];

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const [{ count: userCount }, { count: postCount }, { count: openReportCount }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("reading_posts").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">管理画面</h1>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-beige-200 p-3">
          <p className="font-display text-lg font-bold text-ink">{userCount ?? 0}</p>
          <p className="text-xs text-ink/50">ユーザー数</p>
        </div>
        <div className="rounded-lg border border-beige-200 p-3">
          <p className="font-display text-lg font-bold text-ink">{postCount ?? 0}</p>
          <p className="text-xs text-ink/50">投稿数</p>
        </div>
        <div className="rounded-lg border border-beige-200 p-3">
          <p className="flex items-center justify-center gap-1 font-display text-lg font-bold text-destructive">
            <BookX size={16} /> {openReportCount ?? 0}
          </p>
          <p className="text-xs text-ink/50">未対応の通報</p>
        </div>
      </div>

      <ul className="divide-y divide-beige-200 rounded-lg border border-beige-200">
        {MENU.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 p-4 text-sm hover:bg-beige-50">
              <Icon size={18} className="text-forest-600" /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
