import { NextResponse } from "next/server";

// ISBN/タイトル/著者名から書籍情報を取得するプロキシAPI
// キー不要で使える NDL(国立国会図書館サーチ) を主軸にし、openBD で書影を補完する。
// Google Books はキーレスだと共有クォータ超過(429)で使えないため、
// GOOGLE_BOOKS_API_KEY が設定されている場合のみ利用する。
// クライアントにAPIキーを渡さないよう、必ずサーバー側(Route Handler)経由で呼び出す。

interface ExternalBookResult {
  title: string;
  author: string;
  isbn10?: string;
  isbn13?: string;
  coverImageUrl?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  source: "google_books" | "openbd" | "ndl" | "ai";
}

// ---- Google Books(APIキーがある場合のみ) ----
async function searchGoogleBooks(q: string): Promise<ExternalBookResult[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return []; // キーレスは429になるためスキップ
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("country", "JP");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const json = await res.json();

  return (json.items ?? []).map((item: any) => {
    const info = item.volumeInfo ?? {};
    const identifiers: { type: string; identifier: string }[] = info.industryIdentifiers ?? [];
    return {
      title: info.title ?? "",
      author: (info.authors ?? []).join(", "),
      isbn10: identifiers.find((i) => i.type === "ISBN_10")?.identifier,
      isbn13: identifiers.find((i) => i.type === "ISBN_13")?.identifier,
      coverImageUrl: info.imageLinks?.thumbnail?.replace("http://", "https://"),
      publisher: info.publisher,
      publishedDate: info.publishedDate,
      description: info.description,
      pageCount: info.pageCount,
      source: "google_books",
    } satisfies ExternalBookResult;
  });
}

// ---- openBD(ISBN指定の書誌 + 書影) ----
interface OpenBdInfo {
  cover?: string;
  title?: string;
  author?: string;
  publisher?: string;
  pubdate?: string;
}

// 複数ISBNをまとめて引き、ISBN→書誌情報のMapを返す
async function fetchOpenBd(isbns: string[]): Promise<Map<string, OpenBdInfo>> {
  const map = new Map<string, OpenBdInfo>();
  const unique = [...new Set(isbns.filter(Boolean))];
  if (unique.length === 0) return map;
  try {
    const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${encodeURIComponent(unique.join(","))}`);
    if (!res.ok) return map;
    const json = await res.json();
    for (const rec of json ?? []) {
      const summary = rec?.summary;
      if (!summary?.isbn) continue;
      map.set(summary.isbn, {
        cover: summary.cover || undefined,
        title: summary.title || undefined,
        author: summary.author || undefined,
        publisher: summary.publisher || undefined,
        pubdate: summary.pubdate || undefined,
      });
    }
  } catch {
    // openBDが落ちていても検索自体は継続する
  }
  return map;
}

// ---- NDL(国立国会図書館サーチ) OpenSearch。キー不要でタイトル/著者検索が可能 ----
function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .trim();
}

function pickTag(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeXml(m[1]) : undefined;
}

// 概要に混じるHTMLタグを除去して読みやすいテキストにする
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNdlItems(xml: string): ExternalBookResult[] {
  const blocks = xml.split(/<item>/i).slice(1).map((s) => s.split(/<\/item>/i)[0]);
  const results: ExternalBookResult[] = [];

  for (const block of blocks) {
    const title = pickTag(block, "dc:title") || pickTag(block, "title");
    if (!title) continue;

    const creator = pickTag(block, "dc:creator") || pickTag(block, "author") || "";
    const author = creator
      .split(/[,、;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i) // 同名の重複を除去
      .join(", ");

    const publisher = pickTag(block, "dc:publisher");
    const publishedDate = pickTag(block, "dcterms:issued") || pickTag(block, "dc:date");
    const descriptionRaw = pickTag(block, "dc:description");
    const description = descriptionRaw ? stripHtml(descriptionRaw) : undefined;

    // ISBN: <dc:identifier xsi:type="dcndl:ISBN">978...</dc:identifier>
    const isbnMatch = block.match(/<dc:identifier[^>]*ISBN[^>]*>([\s\S]*?)<\/dc:identifier>/i);
    const isbnRaw = isbnMatch ? isbnMatch[1].replace(/[^0-9Xx]/g, "").toUpperCase() : "";
    const isbn13 = isbnRaw.length === 13 ? isbnRaw : undefined;
    const isbn10 = isbnRaw.length === 10 ? isbnRaw : undefined;

    // ページ数: <dcterms:extent>295p ; 19cm</dcterms:extent>
    const extent = pickTag(block, "dcterms:extent") || pickTag(block, "dc:extent");
    const pageMatch = extent?.match(/(\d+)\s*p/);
    const pageCount = pageMatch ? Number(pageMatch[1]) : undefined;

    results.push({
      title,
      author,
      isbn10,
      isbn13,
      publisher,
      publishedDate,
      description,
      pageCount,
      source: "ndl",
    });
  }

  return results;
}

async function searchNdl(kind: "title" | "creator", keyword: string): Promise<ExternalBookResult[]> {
  const url = new URL("https://ndlsearch.ndl.go.jp/api/opensearch");
  url.searchParams.set(kind, keyword);
  url.searchParams.set("cnt", "15");
  try {
    const res = await fetch(url.toString(), { headers: { Accept: "application/xml" } });
    if (!res.ok) return [];
    return parseNdlItems(await res.text());
  } catch {
    return [];
  }
}

async function searchNdlByIsbn(isbn: string): Promise<ExternalBookResult[]> {
  const url = new URL("https://ndlsearch.ndl.go.jp/api/opensearch");
  url.searchParams.set("isbn", isbn);
  url.searchParams.set("cnt", "5");
  try {
    const res = await fetch(url.toString(), { headers: { Accept: "application/xml" } });
    if (!res.ok) return [];
    return parseNdlItems(await res.text());
  } catch {
    return [];
  }
}

// 書影が無い結果に openBD の書影(と不足している出版社等)を補完する
async function enrichCovers(results: ExternalBookResult[]): Promise<ExternalBookResult[]> {
  const isbns = results.map((r) => r.isbn13 || r.isbn10).filter((v): v is string => !!v);
  if (isbns.length === 0) return results;
  const openBd = await fetchOpenBd(isbns);
  return results.map((r) => {
    const key = r.isbn13 || r.isbn10;
    const info = key ? openBd.get(key) : undefined;
    if (!info) return r;
    return {
      ...r,
      coverImageUrl: r.coverImageUrl || info.cover,
      publisher: r.publisher || info.publisher,
      publishedDate: r.publishedDate || info.pubdate,
    };
  });
}

// 検索語との一致度でスコアリング(完全一致 > 前方一致 > 部分一致)。実本(ISBNあり)を優先
function scoreRelevance(query: string, r: ExternalBookResult): number {
  const t = r.title.toLowerCase();
  const q = query.toLowerCase().trim();
  let s = 0;
  if (t === q) s += 100;
  else if (t.startsWith(q)) s += 60;
  else if (t.includes(q)) s += 30;
  if (r.isbn13 || r.isbn10) s += 10; // 実際に出版された本を優先
  if (t.includes(q)) s += Math.max(0, 20 - Math.abs(t.length - q.length) / 5); // 余計な語が少ないものを優先
  return s;
}

// タイトルを正規化して版違い(ISBN違い)の重複判定に使う。
// 副題(コロン以降)と空白を落として比較するので、
// 「サピエンス全史」と「サピエンス全史 : 文明の構造と人類の幸福」は同一とみなす。
function normalizeTitleKey(title: string): string {
  return (title || "")
    .split(/[:：]/)[0]
    .replace(/[\s　]/g, "")
    .toLowerCase()
    .trim();
}

// より情報量の多い結果を優先する(書影 > ISBN > 概要 > ページ数)
function richness(r: ExternalBookResult): number {
  let s = 0;
  if (r.coverImageUrl) s += 4;
  if (r.isbn13 || r.isbn10) s += 2;
  if (r.description) s += 1;
  if (r.pageCount) s += 1;
  return s;
}

// 同一書籍(正規化タイトル一致)の重複を除去し、最も情報量の多い版を1件だけ残す。
// これにより同じ本の版違いが検索結果に何件も並ぶのを防ぐ。
function dedupe(results: ExternalBookResult[]): ExternalBookResult[] {
  const byKey = new Map<string, ExternalBookResult>();
  for (const r of results) {
    const key = normalizeTitleKey(r.title) || (r.isbn13 || r.isbn10 || r.title).toLowerCase();
    const existing = byKey.get(key);
    if (!existing || richness(r) > richness(existing)) {
      byKey.set(key, r);
    }
  }
  return [...byKey.values()];
}

// ---- Gemini(AI補完。GEMINI_API_KEYがある場合のみ) ----
// 正規の書誌API(Google/NDL)で見つからなかった本を、AIが推定してタイトル・著者・
// あらすじだけ補完する。ISBN・出版社・発売日は誤情報(ハルシネーション)を避けるため
// あえて生成させない。結果は source: "ai" として扱い、UI側で「AI推定」と明示する。
// モデル名はキー/APIバージョンによって異なり固定できないため、ListModelsで
// generateContent対応モデルを取得し、flash系(軽量・無料枠向き)を優先して選ぶ。
// 一度選んだモデルはウォームインスタンス内でキャッシュする。
let cachedGeminiModel: string | null = null;

// ListModelsからgenerateContent対応モデルの一覧を取得し、軽量・新しめを優先して並べる。
// (一覧に載っていても新規キーでは使えない旧モデルがあるため、実際に呼んで確認する)
async function listGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    const names: string[] = (json?.models ?? [])
      .filter((m: any) => (m?.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m: any) => String(m?.name ?? "").replace(/^models\//, ""))
      .filter(Boolean);
    const score = (n: string) => {
      let s = 0;
      if (/flash-lite/i.test(n)) s += 6;
      if (/latest/i.test(n)) s += 5;
      if (/flash/i.test(n)) s += 3;
      if (/2\.5/.test(n)) s += 2;
      if (/2\.0/.test(n)) s += 1;
      // 旧世代・特殊用途・提供終了になりやすいものは避ける
      if (/(vision|thinking|exp|image|audio|tts|live|preview|1\.5|1\.0|pro)/i.test(n)) s -= 5;
      return s;
    };
    return names.filter((n) => /flash|gemini/i.test(n)).sort((a, b) => score(b) - score(a));
  } catch {
    return [];
  }
}

// stripHtml等と衝突しない、Geminiが```json```で囲んで返した場合にフェンスを除去する補助
function stripJsonFences(s: string): string {
  return s
    .replace(/^﻿/, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseGeminiBooks(text: string): ExternalBookResult[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return [];
  }
  // まれに {results:[...]} の形で返る場合も許容する
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any)?.results)
      ? (parsed as any).results
      : Array.isArray((parsed as any)?.books)
        ? (parsed as any).books
        : [];
  return (arr as any[])
    .filter((x) => !!x && typeof x.title === "string")
    .slice(0, 3)
    .map((x) => ({
      title: String(x.title).trim(),
      author: typeof x.author === "string" ? x.author.trim() : "",
      description: typeof x.description === "string" ? x.description.trim() : undefined,
      source: "ai" as const,
    }))
    .filter((r) => r.title);
}

async function searchGemini(query: string, debug?: { info: unknown }): Promise<ExternalBookResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (debug) debug.info = { reason: "no-key" };
    return [];
  }

  // キャッシュ済みの動作モデルがあればそれだけを、無ければ候補一覧を実際に試す
  const candidates = cachedGeminiModel ? [cachedGeminiModel] : (await listGeminiModels(apiKey)).slice(0, 6);
  if (candidates.length === 0) {
    if (debug) debug.info = { stage: "listModels", note: "no-candidates" };
    return [];
  }

  const prompt = [
    "あなたは書籍検索の補助AIです。",
    `次の検索語に一致する実在の書籍を最大3件、JSON配列だけで返してください。検索語: ${query}`,
    "各要素のキーは title(書名), author(著者名), description(日本語で1〜2文の短いあらすじ) の3つだけにしてください。",
    "実在が確認できない本は含めないでください。該当が無ければ空配列 [] を返してください。",
    "ISBN・出版社・発売日・ページ数は不確かなため絶対に含めないでください。",
    "説明文やコードブロックは付けず、JSONだけを出力してください。",
  ].join("\n");

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });

  // 候補モデルを順に試し、最初に成功(200かつ本文あり)したモデルを採用・キャッシュする
  const tried: Array<{ model: string; status?: number; note?: string }> = [];
  for (const model of candidates) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body },
      );
      if (!res.ok) {
        tried.push({ model, status: res.status });
        continue;
      }
      const json = await res.json();
      const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        tried.push({ model, status: 200, note: "no-text" });
        continue;
      }
      cachedGeminiModel = model;
      const results = parseGeminiBooks(text);
      if (debug) debug.info = { model, status: 200, count: results.length, tried };
      return results;
    } catch (e) {
      tried.push({ model, note: String(e).slice(0, 80) });
    }
  }
  if (debug) debug.info = { note: "all-models-failed", tried };
  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "検索クエリ(q)を指定してください" }, { status: 400 });
  }

  try {
    const normalized = query.replace(/[-\s]/g, "");
    const isbnLike = /^(?:97[89])?\d{9}[\dXx]$/.test(normalized);

    // --- ISBN検索: openBD(書影あり) と NDL/Google を併用 ---
    if (isbnLike) {
      const [openBdMap, ndlResults, googleResults] = await Promise.all([
        fetchOpenBd([normalized]),
        searchNdlByIsbn(normalized),
        searchGoogleBooks(`isbn:${normalized}`),
      ]);

      const openBdInfo = openBdMap.get(normalized);
      const openBdResults: ExternalBookResult[] = openBdInfo?.title
        ? [
            {
              title: openBdInfo.title,
              author: openBdInfo.author ?? "",
              isbn13: normalized.length === 13 ? normalized : undefined,
              isbn10: normalized.length === 10 ? normalized : undefined,
              coverImageUrl: openBdInfo.cover,
              publisher: openBdInfo.publisher,
              publishedDate: openBdInfo.pubdate,
              source: "openbd",
            },
          ]
        : [];

      const merged = dedupe([...openBdResults, ...googleResults, ...ndlResults]).filter((r) => r.title);
      const results = await enrichCovers(merged);
      return NextResponse.json({ results });
    }

    // --- タイトル/著者名などのフリーワード検索 ---
    // Google・NDL(タイトル)・NDL(著者)を同時に検索して結果を統合する。
    // どれか1つのソースが的外れな結果を返しても、他のソースで見つかった本が
    // 埋もれないよう、フォールバックではなくマージ方式にしている。
    const [googleResults, ndlTitleResults, ndlCreatorResults] = await Promise.all([
      searchGoogleBooks(query),
      searchNdl("title", query),
      searchNdl("creator", query),
    ]);

    const base = [...googleResults, ...ndlTitleResults, ...ndlCreatorResults];

    let ranked = dedupe(base)
      .filter((r) => r.title)
      .sort((a, b) => scoreRelevance(query, b) - scoreRelevance(query, a))
      .slice(0, 12);

    // 正規の書誌APIで1件も見つからなかった場合のみ、AI(Gemini)で補完する。
    // キー未設定なら searchGemini は空配列を返すので、その場合は従来どおり0件。
    // ?debug=1 を付けるとGemini呼び出しの状態(使用モデル・HTTPステータス等)を返す(動作確認用)。
    const debug = searchParams.get("debug") === "1" ? { info: null as unknown } : undefined;
    if (ranked.length === 0) {
      ranked = await searchGemini(query, debug);
    }

    const results = await enrichCovers(ranked);
    return NextResponse.json(debug ? { results, geminiDebug: debug.info } : { results });
  } catch (error) {
    console.error("search-external error:", error);
    return NextResponse.json({ error: "外部書籍APIの呼び出しに失敗しました" }, { status: 502 });
  }
}
