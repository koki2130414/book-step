import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { RecommendList } from "@/components/books/recommend-list";

// 認証クッキーを使うため常に動的レンダリング(キャッシュしない)
export const dynamic = "force-dynamic";

interface Rec {
  title: string;
  author: string;
  reason: string;
}

// ---- Gemini(おすすめ生成) ----
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

function parseRecs(text: string): Rec[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    return [];
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { results?: unknown[] })?.results)
      ? (parsed as { results: unknown[] }).results
      : Array.isArray((parsed as { books?: unknown[] })?.books)
        ? (parsed as { books: unknown[] }).books
        : [];
  return (arr as Array<Record<string, unknown>>)
    .filter((x) => !!x && typeof x.title === "string")
    .slice(0, 12)
    .map((x) => ({
      title: String(x.title).trim(),
      author: typeof x.author === "string" ? x.author.trim() : "",
      reason: typeof x.reason === "string" ? x.reason.trim() : "",
    }))
    .filter((r) => r.title);
}

async function generateRecommendations(
  read: Array<{ title: string; author: string }>,
): Promise<{ recs: Rec[]; error: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { recs: [], error: "AIの設定が見つかりませんでした。" };

  const candidates = cachedModel ? [cachedModel] : (await listModels(apiKey)).slice(0, 6);
  if (candidates.length === 0) return { recs: [], error: "利用可能なAIモデルが見つかりませんでした。" };

  const list = read.map((b) => `- ${b.title}${b.author ? ` / ${b.author}` : ""}`).join("\n");
  const prompt = [
    "あなたは読書アプリのおすすめAIです。",
    "あるユーザーがこれまでに登録した本の一覧を渡します。傾向(ジャンル・著者・テーマ)を推測し、まだ一覧に無い実在の書籍を最大10件おすすめしてください。",
    "出力はJSON配列だけ。各要素のキーは title(書名), author(著者名), reason(なぜこの人におすすめか。日本語で1〜2文。既読の本に具体的に触れる) の3つだけにしてください。",
    "実在が確認できない本や、一覧に既にある本は含めないでください。",
    "説明文やコードブロックは付けず、JSONだけを出力してください。",
    "ユーザーの登録済みの本:",
    list,
  ].join("\n");

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
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
      return { recs: parseRecs(text), error: null };
    } catch {
      // 次の候補モデルへ
    }
  }
  return { recs: [], error: "おすすめの取得に失敗しました。時間をおいて再度お試しください。" };
}

// ---- 実在確認(Google Books・国立国会図書館サーチで裏取りする) ----
// AIは実在しない本を挙げることがあるため、書誌データベースに載っている本だけに絞る。
function normTitle(s: string): string {
  return s.toLowerCase().replace(/[\s　・:：,，、。.\-—–~〜()（）[\]「」『』!！?？'"’”]/g, "");
}

// AIのタイトルと実データのタイトルが、サブタイトル差などを許容して一致するか判定する
function titlesMatch(a: string, b: string): boolean {
  const na = normTitle(a);
  const nb = normTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  return shorter.length >= 4 && longer.includes(shorter);
}

async function googleLookup(title: string): Promise<Array<{ title: string; author: string }>> {
  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY;
    const url =
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent("intitle:" + title)}` +
      `&country=JP&maxResults=5${key ? `&key=${encodeURIComponent(key)}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const json = await res.json();
    return ((json?.items ?? []) as Array<{ volumeInfo?: { title?: string; authors?: string[] } }>)
      .map((it) => ({
        title: it?.volumeInfo?.title ?? "",
        author: (it?.volumeInfo?.authors ?? []).join(", "),
      }))
      .filter((b) => b.title);
  } catch {
    return [];
  }
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

async function ndlLookup(title: string): Promise<Array<{ title: string; author: string }>> {
  try {
    const url = `https://ndlsearch.ndl.go.jp/api/opensearch?title=${encodeURIComponent(title)}&cnt=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: Array<{ title: string; author: string }> = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) {
      const block = m[1];
      const t = block.match(/<title>([\s\S]*?)<\/title>/);
      const c = block.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/) || block.match(/<author>([\s\S]*?)<\/author>/);
      const tt = t ? decodeXml(t[1]) : "";
      if (tt) items.push({ title: tt, author: c ? decodeXml(c[1]) : "" });
    }
    return items;
  } catch {
    return [];
  }
}

// Geminiが挙げた本を実在の書誌DBで裏取りし、確認できた本だけを実在のタイトル・著者に置き換えて返す
async function verifyRecs(recs: Rec[]): Promise<Rec[]> {
  const checked = await Promise.all(
    recs.map(async (r) => {
      const candidates = [...(await googleLookup(r.title)), ...(await ndlLookup(r.title))];
      const hit = candidates.find((c) => titlesMatch(r.title, c.title));
      if (!hit) return null;
      return { title: hit.title, author: hit.author || r.author, reason: r.reason };
    }),
  );
  const seen = new Set<string>();
  const out: Rec[] = [];
  for (const r of checked) {
    if (!r) continue;
    const key = normTitle(r.title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

// ---- おすすめの本をワンタップで「読みたい」本棚へ追加するサーバーアクション ----
async function addWantToRead(title: string, author: string): Promise<{ ok: boolean; message: string }> {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "ログインが必要です" };

  // 同じ書名の本が既に自分の本棚にあればスキップ(重複登録を防ぐ)
  const { data: mine } = await supabase.from("reading_posts").select("books(title)").eq("user_id", user.id);
  const owned = new Set(
    (mine ?? []).map((r) => (r as { books?: { title?: string } }).books?.title).filter(Boolean),
  );
  if (owned.has(title)) return { ok: false, message: "すでに本棚にあります" };

  const { data: book, error: bookError } = await supabase
    .from("books")
    .insert({ title, author: author || "著者不明", external_source: "ai", created_by: user.id })
    .select("id")
    .single();
  if (bookError || !book) return { ok: false, message: "追加に失敗しました" };

  const { error: postError } = await supabase.from("reading_posts").insert({
    user_id: user.id,
    book_id: book.id as string,
    reading_status: "want_to_read",
    visibility: "friends_only",
  });
  if (postError) return { ok: false, message: "追加に失敗しました" };

  revalidatePath("/shelf");
  revalidatePath("/home");
  return { ok: true, message: "「読みたい」に追加しました" };
}

export default async function RecommendPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const { data: rows } = await supabase
    .from("reading_posts")
    .select("books(title, author)")
    .eq("user_id", profile.id);

  const seen = new Set<string>();
  const read = (rows ?? [])
    .map((r) => {
      const b = (r as { books?: { title?: string; author?: string } }).books;
      return { title: b?.title ?? "", author: b?.author ?? "" };
    })
    .filter((b) => b.title && b.title !== "タイトル未設定")
    .filter((b) => {
      if (seen.has(b.title)) return false;
      seen.add(b.title);
      return true;
    });

  let recs: Rec[] = [];
  let genError: string | null = null;
  if (read.length > 0) {
    const result = await generateRecommendations(read);
    genError = result.error;
    // 実在確認をして、既に本棚にある本も除外する
    const readNorm = new Set(read.map((b) => normTitle(b.title)));
    recs = (await verifyRecs(result.recs)).filter((r) => !readNorm.has(normTitle(r.title)));
    if (!genError && result.recs.length > 0 && recs.length === 0) {
      genError = "おすすめ候補の実在を確認できませんでした。もう一度お試しください。";
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
          <Sparkles size={22} className="text-forest-600" />
          あなたへのおすすめ
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          {read.length > 0
            ? `本棚の${read.length}冊の傾向から、AIが次の一冊を提案します。`
            : "読書傾向から、AIが次の一冊を提案します。"}
        </p>
      </div>

      {read.length === 0 ? (
        <div className="rounded-lg border border-beige-200 bg-beige-50/60 p-6 text-center text-sm text-ink/60">
          <p>まずは本を数冊登録してみましょう。傾向がわかると、あなた向けのおすすめが表示されます。</p>
          <div className="mt-3">
            <Link href="/books/new" className="font-medium text-forest-700 hover:underline">
              本を登録する
            </Link>
          </div>
        </div>
      ) : recs.length > 0 ? (
        <>
          <RecommendList items={recs} addAction={addWantToRead} />
          <p className="text-center text-xs text-ink/40">
            AIが提案し、Google Books・国立国会図書館サーチで実在を確認した本です。
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-beige-200 bg-beige-50/60 p-6 text-center text-sm text-ink/60">
          <p>{genError ?? "おすすめを取得できませんでした。"}</p>
          <div className="mt-3">
            <Link href="/recommend" className="font-medium text-forest-700 hover:underline">
              再読み込み
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
