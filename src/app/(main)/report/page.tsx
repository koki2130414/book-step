import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, BookOpen, Timer, Sparkles, Tag } from "lucide-react";
import { getCurrentProfile } from "@/lib/data/profile";
import { getMonthlyStats, type MonthlyStats } from "@/lib/data/reading-activity";

// 認証クッキーを使うため常に動的レンダリング(キャッシュしない)
export const dynamic = "force-dynamic";

// ---- Gemini(月間レポートの振り返り文) ----
let cachedModel: string | null = null;

async function listModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const names: string[] = (json?.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        (m?.supportedGenerationMethods ?? []).includes("generateContent"),
      )
      .map((m: { name?: string }) => String(m?.name ?? "").replace(/^models\//, ""))
      .filter(Boolean);
    const score = (n: string) => {
      let s = 0;
      if (/flash-lite/i.test(n)) s += 6;
      if (/latest/i.test(n)) s += 5;
      if (/flash/i.test(n)) s += 3;
      if (/2\.5/.test(n)) s += 2;
      if (/2\.0/.test(n)) s += 1;
      if (/(vision|thinking|exp|image|audio|tts|live|preview|1\.5|1\.0|pro)/i.test(n)) s -= 5;
      return s;
    };
    return names.filter((n) => /flash|gemini/i.test(n)).sort((a, b) => score(b) - score(a));
  } catch {
    return [];
  }
}

function stripFences(s: string): string {
  return s
    .replace(/^﻿/, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

async function generateReflection(
  stats: MonthlyStats,
): Promise<{ reflection: string; suggestion: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const candidates = cachedModel ? [cachedModel] : (await listModels(apiKey)).slice(0, 6);
  if (candidates.length === 0) return null;

  const bookList = stats.finishedBooks
    .map((b) => `- ${b.title}${b.author ? ` / ${b.author}` : ""}${b.genre ? `（${b.genre}）` : ""}`)
    .join("\n");
  const prompt = [
    "あなたは読書アプリの、あたたかく励ますAIコーチです。",
    `あるユーザーの${stats.year}年${stats.month}月の読書実績を渡します。`,
    `読了した本: ${stats.finishedCount}冊`,
    bookList || "(今月の読了本はまだありません)",
    `集中タイマーの記録: ${stats.sessionCount}回・合計${stats.sessionMinutes}分`,
    stats.topGenres.length > 0
      ? `よく読んだジャンル: ${stats.topGenres.map((g) => `${g.name}(${g.count})`).join("、")}`
      : "",
    "この内容をもとに、日本語で次の2つを作ってください。",
    "1) reflection: 今月の読書を前向きに振り返る文章(2〜3文、やさしく具体的に。実績が少なくても否定せず励ます)。",
    "2) suggestion: 来月に向けたおすすめ(読むジャンルの提案や、続けるためのちょっとした工夫を1〜2文)。",
    "出力はJSONオブジェクトだけ。キーは reflection と suggestion の2つ。コードブロックや説明は不要。",
  ]
    .filter(Boolean)
    .join("\n");

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.6 },
  });

  for (const model of candidates) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body },
      );
      if (!res.ok) continue;
      const json = await res.json();
      const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      cachedModel = model;
      try {
        const parsed = JSON.parse(stripFences(text));
        const reflection = typeof parsed?.reflection === "string" ? parsed.reflection.trim() : "";
        const suggestion = typeof parsed?.suggestion === "string" ? parsed.suggestion.trim() : "";
        if (reflection || suggestion) return { reflection, suggestion };
      } catch {
        // 次の候補モデルへ
      }
    } catch {
      // 次の候補モデルへ
    }
  }
  return null;
}

export default async function ReportPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const stats = await getMonthlyStats(profile.id);
  const hasData = stats.finishedCount > 0 || stats.sessionCount > 0;
  const ai = hasData ? await generateReflection(stats) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <BarChart3 size={22} className="text-forest-600" />
          {stats.year}年{stats.month}月の読書レポート
        </h1>
        <p className="mt-1 text-sm text-ink/60">今月のあなたの読書をふり返ります。</p>
      </div>

      {/* 数値サマリー */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-beige-200 bg-paper p-3">
          <BookOpen className="mx-auto mb-1 text-forest-600" size={18} />
          <p className="font-display text-lg font-bold text-ink">{stats.finishedCount}</p>
          <p className="text-xs text-ink/50">読了</p>
        </div>
        <div className="rounded-lg border border-beige-200 bg-paper p-3">
          <Timer className="mx-auto mb-1 text-forest-600" size={18} />
          <p className="font-display text-lg font-bold text-ink">{stats.sessionMinutes}</p>
          <p className="text-xs text-ink/50">集中(分)</p>
        </div>
        <div className="rounded-lg border border-beige-200 bg-paper p-3">
          <Sparkles className="mx-auto mb-1 text-forest-600" size={18} />
          <p className="font-display text-lg font-bold text-ink">{stats.sessionCount}</p>
          <p className="text-xs text-ink/50">タイマー回数</p>
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-lg border border-beige-200 bg-beige-50/60 p-6 text-center text-sm text-ink/60">
          <p>今月の記録はまだありません。1冊登録したり、集中タイマーで5分読むと、ここにレポートが表示されます。</p>
          <div className="mt-3 flex justify-center gap-4">
            <Link href="/easy" className="font-medium text-forest-700 hover:underline">
              らくらく読書へ
            </Link>
            <Link href="/books/new" className="font-medium text-forest-700 hover:underline">
              本を登録する
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* AIの振り返り */}
          {ai && (ai.reflection || ai.suggestion) && (
            <section className="space-y-3 rounded-lg border border-forest-100 bg-forest-50/60 p-5">
              <h2 className="flex items-center gap-2 font-display font-semibold text-forest-700">
                <Sparkles size={18} />
                AIからのひとこと
              </h2>
              {ai.reflection && <p className="text-sm leading-relaxed text-ink/80">{ai.reflection}</p>}
              {ai.suggestion && (
                <p className="rounded-md bg-paper/70 p-3 text-sm leading-relaxed text-ink/80">
                  <span className="font-medium text-forest-700">来月への提案：</span>
                  {ai.suggestion}
                </p>
              )}
            </section>
          )}

          {/* よく読んだジャンル */}
          {stats.topGenres.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 font-display font-semibold text-ink">
                <Tag size={16} className="text-forest-600" />
                よく読んだジャンル
              </h2>
              <div className="flex flex-wrap gap-2">
                {stats.topGenres.map((g) => (
                  <span
                    key={g.name}
                    className="rounded-full bg-beige-100 px-3 py-1 text-xs text-clay-500"
                  >
                    {g.name}（{g.count}）
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 今月読んだ本 */}
          {stats.finishedBooks.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-display font-semibold text-ink">今月読み終えた本</h2>
              <ul className="space-y-2">
                {stats.finishedBooks.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-beige-200 bg-paper p-3"
                  >
                    <BookOpen size={16} className="shrink-0 text-forest-600" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{b.title}</p>
                      {b.author && <p className="truncate text-xs text-ink/50">{b.author}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
