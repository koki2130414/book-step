"use client";
// シンプルなトースト通知(成功/エラー表示用)
import * as React from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";
interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast は ToastProvider の内側で使用してください");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const showToast = React.useCallback((message: string, variant: ToastVariant = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-slide-up rounded-md px-4 py-3 text-sm shadow-lg",
              t.variant === "success" && "bg-forest-600 text-paper",
              t.variant === "error" && "bg-destructive text-destructive-foreground",
              t.variant === "info" && "bg-ink text-paper",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
