import Link from "next/link";
import { Bell, BookOpen, MessageCircle } from "lucide-react";

// PC/モバイル共通のヘッダー。未読通知数はサーバーコンポーネントから渡す
export function Header({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <header className="sticky top-0 z-30 border-b border-beige-200 bg-paper/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/home" className="flex items-center gap-2 font-display text-lg font-bold text-forest-700">
          <BookOpen size={22} />
          BOOK STEP
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/home" className="text-sm text-ink/70 hover:text-ink">ホーム</Link>
          <Link href="/search" className="text-sm text-ink/70 hover:text-ink">検索</Link>
          <Link href="/shelf" className="text-sm text-ink/70 hover:text-ink">本棚</Link>
          <Link href="/recommend" className="text-sm text-ink/70 hover:text-ink">おすすめ</Link>
          <Link href="/easy" className="text-sm text-ink/70 hover:text-ink">らくらく</Link>
          <Link href="/messages" className="text-sm text-ink/70 hover:text-ink">チャット</Link>
          <Link href="/goals" className="text-sm text-ink/70 hover:text-ink">目標</Link>
          <a
            href="https://forms.gle/Pd4xuw2HKKDxe74K7"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink/70 hover:text-ink"
          >
            お問い合わせ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/messages" aria-label="チャット" className="rounded-full p-2 hover:bg-beige-50 md:hidden">
            <MessageCircle size={20} className="text-ink/70" />
          </Link>
          <Link href="/notifications" aria-label="通知" className="relative rounded-full p-2 hover:bg-beige-50">
            <Bell size={20} className="text-ink/70" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/profile" className="hidden text-sm text-ink/70 hover:text-ink md:block">マイページ</Link>
        </div>
      </div>
    </header>
  );
}
