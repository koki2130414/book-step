import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { getCurrentProfile, getUnreadNotificationCount } from "@/lib/data/profile";

// ログイン必須エリア共通レイアウト(ヘッダー + 下部ナビゲーション)
// 未ログインアクセスの一次防御はmiddlewareで行うが、ここでも二重にチェックする
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const unreadCount = await getUnreadNotificationCount(profile.id);

  return (
    <div className="min-h-screen bg-paper pb-20 md:pb-0">
      <Header unreadCount={unreadCount} />
      <div className="container py-6">{children}</div>
      <footer className="border-t border-beige-200 py-6 text-center">
        <a
          href="https://forms.gle/Pd4xuw2HKKDxe74K7"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-ink/60 hover:text-ink hover:underline"
        >
          お問い合わせ
        </a>
        <p className="mt-2 text-xs text-ink/30">© BOOK STEP</p>
      </footer>
      <BottomNav />
    </div>
  );
}
