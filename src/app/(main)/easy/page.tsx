import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Feather,
  Timer,
  Headphones,
  BellOff,
  ListChecks,
  Compass,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { EasySummary } from "@/components/easy/easy-summary";

// 認証クッキーを使うため常に動的レンダリング(キャッシュしない)
export const dynamic = "force-dynamic";

// ---- 読書のコツ集(静的コンテンツ) ----
// 本を読むのが苦手・集中が続かない人向けの、ハードルを下げる具体的なアドバイス
const TIPS: { icon: typeof Feather; title: string; body: string }[] = [
  {
    icon: Timer,
    title: "まずは5分だけ",
    body: "「1冊読む」ではなく「5分だけ読む」と決めましょう。タイマーをかけて、鳴ったらやめてOK。短く区切ると始めやすく、気づけば続いていることも。",
  },
  {
    icon: Feather,
    title: "全部読まなくていい",
    body: "目次や見出し、気になった章だけをつまみ読みするのも立派な読書です。最初から順番に、完璧に読もうとしないことが続けるコツ。",
  },
  {
    icon: BellOff,
    title: "スマホを遠ざける",
    body: "集中が切れる最大の原因は通知。読む間だけスマホを別の部屋に置くか、通知をオフに。5分でも「邪魔が入らない環境」を作りましょう。",
  },
  {
    icon: Headphones,
    title: "耳で読むのもアリ",
    body: "文字を追うのが疲れるときは、オーディオブックや読み上げ機能で「聴く読書」を。通勤・家事のながら時間が読書時間に変わります。",
  },
  {
    icon: Compass,
    title: "興味のあるところから",
    body: "面白そうなページや結論から読み始めてOK。「続きが気になる」という気持ちが、次のページをめくる一番の力になります。",
  },
  {
    icon: ListChecks,
    title: "読んだら記録して達成感",
    body: "1冊でも1ページでも、読んだらBOOK STEPに記録を。積み上がった冊数が見えると、それ自体が次を読むモチベーションになります。",
  },
];

// ---- Gemini(かんたん要約) ----
// 一度使えたモデルはウォームインスタンス内でキャッシュする
let cachedModel: string | null = null;

// generateContent対応モデルを取得し、軽量・新しめを優先して並べる
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

function parsePoints(text: string): string[] {
  const cleaned = stripFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // JSONで返らなかった場合は改行・箇条書き記号で分割する
    return cleaned
      .split(/\n+/)
      .map((l) => l.replace(/^[\s・\-*0-9.、)）]+/, "").trim())
      .filter(Boolean)
      .slice(0, 4);
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { points?: unknown[] })?.points)
      ? (parsed as { points: unknown[] }).points
      : Array.isArray((parsed as { summary?: unknown[] })?.summary)
        ? (parsed as { summary: unknown[] }).summary
        : [];
  return (arr as unknown[])
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);
}

// ---- 1冊のかんたん要約を返すサーバーアクション ----
async function summarizeBook(
  title: string,
  author: string,
): Promise<{ ok: boolean; points: string[]; error: string | null }> {
  "use server";
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, points: [], error: "ログインが必要です" };
  if (!title) return { ok: false, points: [], error: "本の情報がありません" };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, points: [], error: "AIの設定が見つかりませんでした。" };

  const candidates = cachedModel ? [cachedModel] : (await listModels(apiKey)).slice(0, 6);
  if (candidates.length === 0)
    return { ok: false, points: [], error: "利用可能なAIモデルが見つかりませんでした。" };

  const prompt = [
    "あなたは読書が苦手な人をサポートするAIです。",
    `次の本について、読むのが苦手な人でも要点がつかめる「かんたん要約」を作ってください。`,
    `本のタイトル: ${title}${author ? `\n著者: ${author}` : ""}`,
    "条件:",
    "- 日本語で、短くやさしい文の箇条書きにする(各項目は40文字以内が目安)。",
    "- 3〜4項目。何がテーマの本か、読むと何がわかる・得られるかが伝わるようにする。",
    "- 難しい専門用語は避け、中学生でもわかる言葉で書く。",
    "- 本の内容が特定できない場合でも、タイトルから推測できる範囲でやさしく書く。",
    "出力はJSON配列(文字列の配列)だけ。説明やコードブロックは付けないでください。",
  ].join("\n");

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.5 },
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
      const points = parsePoints(text);
      if (points.length === 0) continue;
      return { ok: true, points, error: null };
    } catch {
      // 次の候補モデルへ
    }
  }
  return { ok: false, points: [], error: "要約の取得に失敗しました。時間をおいて再度お試しください。" };
}

export default async function EasyReadingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const { data: rows } = await supabase
    .from("reading_posts")
    .select("books(title, author, cover_image_url)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const seen = new Set<string>();
  const books = (rows ?? [])
    .map((r) => {
      const b = (r as { books?: { title?: string; author?: string; cover_image_url?: string } }).books;
      return {
        title: b?.title ?? "",
        author: b?.author ?? "",
        cover: b?.cover_image_url ?? null,
      };
    })
    .filter((b) => b.title && b.title !== "タイトル未設定")
    .filter((b) => {
      if (seen.has(b.title)) return false;
      seen.add(b.title);
      return true;
    })
    .slice(0, 30);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <Feather size={22} className="text-forest-600" />
          らくらく読書
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          本を読むのが苦手でも、集中が続かなくても大丈夫。ハードルを下げるコツと、AIのかんたん要約でゆっくり読書を楽しみましょう。
        </p>
      </div>

      {/* 読書のコツ集 */}
      <section className="space-y-3">
        <h2 className="font-display font-semibold text-ink">続けるための読書のコツ</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map((tip) => (
            <div key={tip.title} className="rounded-lg border border-beige-200 bg-paper p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-600">
                  <tip.icon size={16} />
                </span>
                <h3 className="font-medium text-ink">{tip.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{tip.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AIかんたん要約 */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display font-semibold text-ink">
          <Sparkles size={18} className="text-forest-600" />
          AIかんたん要約
        </h2>
        <p className="text-sm text-ink/60">
          本棚の本をタップすると、AIが要点を数行にまとめます。「読む前のあらすじ」や「読まずに要点だけ」を知りたいときに。
        </p>
        {books.length === 0 ? (
          <div className="rounded-lg border border-beige-200 bg-beige-50/60 p-6 text-center text-sm text-ink/60">
            <p>まずは本を登録すると、ここでかんたん要約が使えます。</p>
            <div className="mt-3">
              <Link href="/books/new" className="font-medium text-forest-700 hover:underline">
                本を登録する
              </Link>
            </div>
          </div>
        ) : (
          <>
            <EasySummary books={books} summarizeAction={summarizeBook} />
            <p className="text-center text-xs text-ink/40">
              AIが生成した要約です。内容が実際と異なる場合があります。詳しくは本文をご確認ください。
            </p>
          </>
        )}
      </section>
    </div>
  );
}
