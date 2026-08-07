"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      className="flex w-full items-center justify-between p-4 text-sm hover:bg-beige-50"
    >
      <span className="flex items-center gap-2">
        {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
        ダークモード
      </span>
      <span
        className="relative h-6 w-11 rounded-full bg-beige-200 transition-colors data-[on=true]:bg-forest-600"
        data-on={theme === "dark"}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform"
          style={{ transform: theme === "dark" ? "translateX(22px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}
