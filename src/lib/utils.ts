import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 許可するURLスキームのみを通すバリデーション(XSS/危険スキーム対策)
const ALLOWED_URL_PATTERN = /^https?:\/\//i;

export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return true; // 未入力は許可(必須ではないため)
  try {
    const parsed = new URL(url);
    return ALLOWED_URL_PATTERN.test(url) && (parsed.protocol === "http:" || parsed.protocol === "https:");
  } catch {
    return false;
  }
}

// YouTubeのURLから安全にvideo IDのみを抽出し、埋め込み用URLを生成する
// (任意のiframe srcを直接受け付けず、IDだけを許可リスト形式で組み立てる)
export function toSafeYoutubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}`;
    }
  }
  return null;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export const READING_STATUS_LABELS: Record<string, string> = {
  want_to_read: "読みたい",
  reading: "読書中",
  finished: "読了",
  paused: "中断",
  reread_wanted: "再読したい",
};

export const VISIBILITY_LABELS: Record<string, string> = {
  public: "全体公開",
  friends_only: "友達のみ",
  private: "非公開",
};
