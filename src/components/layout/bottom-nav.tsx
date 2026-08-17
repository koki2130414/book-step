"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, Library, Sparkles, Feather, Target, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/search", label: "検索", icon: Search },
  { href: "/books/new", label: "本を追加", icon: PlusCircle, isCentral: true },
  { href: "/shelf", label: "本棚", icon: Library },
  { href: "/recommend", label: "おすすめ", icon: Sparkles },
  { href: "/easy", label: "らくらく", icon: Feather },
  { href: "/goals", label: "目標", icon: Target },
  { href: "/profile", label: "マイページ", icon: User },
];

// スマートフォン向けの下部ナビゲーション。「本を追加」は中央に強調配置
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-beige-200 bg-paper/95 backdrop-blur md:hidden"
      aria-label="メインナビゲーション"
    >
      <ul className="flex items-end justify-between px-0.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isCentral }) => {
          const active = pathname === href;
          if (isCentral) {
            return (
              <li key={href} className="-mt-6 flex flex-1 justify-center">
                <Link
                  href={href}
                  aria-label={label}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-600 text-paper shadow-lg transition-transform hover:scale-105"
                >
                  <Icon size={26} />
                </Link>
              </li>
            );
          }
          return (
            <li key={href} className="flex flex-1 justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-0.5 py-1 text-[10px]",
                  active ? "text-forest-700" : "text-ink/50",
                )}
              >
                <Icon size={20} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
