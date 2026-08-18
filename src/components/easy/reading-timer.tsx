"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Play, Pause, RotateCcw, Flame, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

interface Activity {
  todaySessions: number;
  todayMinutes: number;
  streakDays: number;
}

interface ReadingTimerProps {
  initial: Activity;
  // 完了した集中セッションを記録し、更新後の実績を返すサーバーアクション
  recordAction: (durationMin: number) => Promise<Activity>;
}

const PRESETS = [5, 10, 15];

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// 集中して読書するためのポモドーロ風タイマー。
// 「まずは5分だけ」を実際に押して始められ、終わると記録が残る。
export function ReadingTimer({ initial, recordAction }: ReadingTimerProps) {
  const { showToast } = useToast();
  const [minutes, setMinutes] = useState(5);
  const [remaining, setRemaining] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [activity, setActivity] = useState<Activity>(initial);
  const [, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // プリセット変更時はタイマーをリセット
  const selectMinutes = (m: number) => {
    stopInterval();
    setMinutes(m);
    setRemaining(m * 60);
    setRunning(false);
    setFinished(false);
  };

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  const handleComplete = (durationMin: number) => {
    // やさしい合図(対応端末のみ)
    try {
      navigator.vibrate?.([120, 60, 120]);
    } catch {
      /* noop */
    }
    startTransition(async () => {
      try {
        const next = await recordAction(durationMin);
        setActivity(next);
        showToast("おつかれさま！記録しました", "success");
      } catch {
        showToast("記録に失敗しました", "error");
      }
    });
  };

  const toggle = () => {
    if (finished) {
      // リセットしてもう一度
      selectMinutes(minutes);
      return;
    }
    setRunning((r) => !r);
  };

  const reset = () => {
    stopInterval();
    setRemaining(minutes * 60);
    setRunning(false);
    setFinished(false);
  };

  useEffect(() => {
    if (!running) {
      stopInterval();
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          stopInterval();
          setRunning(false);
          setFinished(true);
          handleComplete(minutes);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return stopInterval;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const progress = 1 - remaining / (minutes * 60);
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="rounded-lg border border-beige-200 bg-paper p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display font-semibold text-ink">集中タイマー</h3>
        <span className="flex items-center gap-1 rounded-full bg-beige-100 px-2.5 py-1 text-xs font-medium text-clay-500">
          <Flame size={13} className="text-clay-600" />
          {activity.streakDays}日連続
        </span>
      </div>

      {/* 時間プリセット */}
      <div className="mb-5 flex justify-center gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => selectMinutes(m)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              minutes === m
                ? "border-forest-600 bg-forest-600 text-paper"
                : "border-beige-200 text-ink/70 hover:bg-beige-50",
            )}
          >
            {m}分
          </button>
        ))}
      </div>

      {/* カウントダウン(円形プログレス) */}
      <div className="flex flex-col items-center">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-beige-100" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-forest-500 transition-[stroke-dashoffset] duration-1000 ease-linear"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            {finished ? (
              <Check size={32} className="text-forest-600" />
            ) : (
              <span className="font-display text-3xl font-bold tabular-nums text-ink">{fmt(remaining)}</span>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="flex h-12 items-center gap-2 rounded-full bg-forest-600 px-6 font-medium text-paper transition-transform hover:scale-105"
          >
            {finished ? (
              <>
                <RotateCcw size={18} /> もう一度
              </>
            ) : running ? (
              <>
                <Pause size={18} /> 一時停止
              </>
            ) : (
              <>
                <Play size={18} /> {remaining === minutes * 60 ? "はじめる" : "再開"}
              </>
            )}
          </button>
          {!finished && remaining !== minutes * 60 && (
            <button
              type="button"
              onClick={reset}
              aria-label="リセット"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-beige-200 text-ink/60 hover:bg-beige-50"
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-ink/50">
          今日は {activity.todaySessions} 回・{activity.todayMinutes} 分読みました
        </p>
      </div>
    </div>
  );
}
