import { NextResponse } from "next/server";

// ISBN/タイトル/著者名から書籍情報を取得するプロキシAPI
// Google Books API(APIキーがあれば優先) → OpenBD(ISBNのみ) の順にフォールバック
// クライアントにAPIキーを渡さないよう、必ずサーバー側(Route Handler)経由で呼び出す

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
  source: "google_books" | "openbd";
}

async function searchGoogleBooks(q: string): Promise<ExternalBookResult[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("country", "JP");
  if (apiKey) url.searchParams.set("key", apiKey);

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

async function searchOpenBd(isbn: string): Promise<ExternalBookResult[]> {
  const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${encodeURIComponent(isbn)}`);
  if (!res.ok) return [];
  const json = await res.json();
  const record = json?.[0];
  if (!record) return [];

  const summary = record.summary ?? {};
  return [
    {
      title: summary.title ?? "",
      author: summary.author ?? "",
      isbn13: summary.isbn,
      coverImageUrl: summary.cover,
      publisher: summary.publisher,
      publishedDate: summary.pubdate,
      source: "openbd",
    },
  ];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "検索クエリ(q)を指定してください" }, { status: 400 });
  }

  try {
    const isbnLike = /^[0-9]{10}(?:[0-9]{3})?$/.test(query.replace(/-/g, ""));

    if (isbnLike) {
      const isbn = query.replace(/-/g, "");
      const [openBdResults, googleResults] = await Promise.all([searchOpenBd(isbn), searchGoogleBooks(`isbn:${isbn}`)]);
      const results = [...openBdResults, ...googleResults].filter((r) => r.title);
      return NextResponse.json({ results });
    }

    const results = await searchGoogleBooks(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("search-external error:", error);
    return NextResponse.json({ error: "外部書籍APIの呼び出しに失敗しました" }, { status: 502 });
  }
}
