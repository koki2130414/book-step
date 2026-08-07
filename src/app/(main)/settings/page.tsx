import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";
import { SignOutButton } from "@/components/settings/sign-out-button";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { getCurrentProfile } from "@/lib/data/profile";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">設定</h1>

      <ul className="divide-y divide-beige-200 rounded-lg border border-beige-200">
        <li><ThemeToggle /></li>
        <li>
          <Link href="/profile/edit" className="flex items-center justify-between p-4 text-sm hover:bg-beige-50">
            プロフィール編集 <ChevronRight size={16} className="text-ink/30" />
          </Link>
        </li>
        <li>
          <Link href="/goals" className="flex items-center justify-between p-4 text-sm hover:bg-beige-50">
            読書目標 <ChevronRight size={16} className="text-ink/30" />
          </Link>
        </li>
        <li>
          <Link href="/reset-password" className="flex items-center justify-between p-4 text-sm hover:bg-beige-50">
            パスワードを変更する <ChevronRight size={16} className="text-ink/30" />
          </Link>
        </li>
        {profile.role === "admin" && (
          <li>
            <Link href="/admin" className="flex items-center justify-between p-4 text-sm text-forest-700 hover:bg-beige-50">
              <span className="flex items-center gap-2"><Shield size={16} /> 管理画面</span>
              <ChevronRight size={16} className="text-ink/30" />
            </Link>
          </li>
        )}
      </ul>

      <SignOutButton />
    </div>
  );
}
