import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

// データが0件のときの案内表示(空状態は「行動への招待」として扱う)
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-beige-300 bg-beige-50/50 px-6 py-16 text-center">
      <div className="text-beige-300">{icon ?? <BookOpen size={40} />}</div>
      <p className="font-display text-base font-medium text-ink">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink/60">{description}</p>}
      {action}
    </div>
  );
}
