"use client";
import { useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

interface ReminderSettingsProps {
  initialEnabled: boolean;
  initialHour: number;
  saveAction: (enabled: boolean, hour: number) => Promise<{ ok: boolean }>;
}

// 読書リマインダーの設定。時刻を選んでオンにすると、その時刻以降にまだ読んでいない日、
// ホームで「今日まだ読んでいません」とやさしく声かけする(アプリ内リマインダー)。
export function ReminderSettings({ initialEnabled, initialHour, saveAction }: ReminderSettingsProps) {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [hour, setHour] = useState(initialHour);
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const persist = (nextEnabled: boolean, nextHour: number) => {
    setSaving(true);
    startTransition(async () => {
      try {
        await saveAction(nextEnabled, nextHour);
        showToast(nextEnabled ? "リマインダーをオンにしました" : "リマインダーをオフにしました");
      } catch {
        showToast("設定の保存に失敗しました", "error");
      } finally {
        setSaving(false);
      }
    });
  };

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    persist(next, hour);
  };

  const changeHour = (h: number) => {
    setHour(h);
    if (enabled) persist(true, h);
  };

  return (
    <div className="rounded-lg border border-beige-200 bg-paper p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-100 text-forest-600">
            {enabled ? <Bell size={16} /> : <BellOff size={16} />}
          </span>
          <div>
            <h3 className="font-display font-semibold text-ink">読書リマインダー</h3>
            <p className="text-xs text-ink/50">決めた時刻に、そっと読書を思い出させます</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          aria-pressed={enabled}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            enabled ? "bg-forest-600" : "bg-beige-200",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-transform",
              enabled ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-4 flex items-center gap-3 border-t border-beige-200 pt-4">
          <label htmlFor="reminder-hour" className="text-sm text-ink/70">
            毎日
          </label>
          <select
            id="reminder-hour"
            value={hour}
            onChange={(e) => changeHour(Number(e.target.value))}
            disabled={saving}
            className="rounded-md border border-beige-200 bg-paper px-3 py-1.5 text-sm text-ink focus:border-forest-500 focus:outline-none"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
          <span className="text-sm text-ink/70">ごろ</span>
          {saving && <Loader2 size={14} className="animate-spin text-ink/40" />}
        </div>
      )}
    </div>
  );
}
