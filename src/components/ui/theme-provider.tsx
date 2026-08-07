"use client";
// localStorageベースのシンプルなダークモード切り替え(next-themes非依存)
import * as React from "react";

type Theme = "light" | "dark";
interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "book-step-theme";

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme は ThemeProvider の内側で使用してください");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
