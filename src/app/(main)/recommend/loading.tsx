import { Loader2 } from "lucide-react";

// Geminiでおすすめを生成する数秒間、スピナーを表示する
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 py-20 text-ink/50">
      <Loader2 size={28} className="animate-spin text-forest-600" />
      <p className="text-sm">あなたの読書傾向からおすすめを考えています…</p>
    </div>
  );
}
