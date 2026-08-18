import { createClient } from "@/lib/supabase/server";

// 日本時間(Asia/Tokyo)での "YYYY-MM-DD" を返す。ストリークや「今日」の判定に使う
function jstDateKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

// 今日(JST)のキー
function todayKey(): string {
  return jstDateKey(new Date());
}

// キー("YYYY-MM-DD")の n 日前のキーを返す
function shiftKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

export interface ReadingActivity {
  todaySessions: number;
  todayMinutes: number;
  streakDays: number;
  readToday: boolean;
}

// 今日の読書セッション数・分数と、連続読書日数(ストリーク)を求める。
// 「読書した日」= 集中タイマーの記録がある日 or 本を登録/読了した日。
export async function getReadingActivity(userId: string): Promise<ReadingActivity> {
  const supabase = createClient();

  const [{ data: sessions }, { data: posts }] = await Promise.all([
    supabase
      .from("reading_sessions")
      .select("duration_min, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("reading_posts")
      .select("created_at, finished_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const today = todayKey();
  let todaySessions = 0;
  let todayMinutes = 0;
  const activeDays = new Set<string>();

  for (const s of sessions ?? []) {
    const key = jstDateKey(s.created_at as string);
    activeDays.add(key);
    if (key === today) {
      todaySessions += 1;
      todayMinutes += (s.duration_min as number) ?? 0;
    }
  }
  for (const p of posts ?? []) {
    if (p.created_at) activeDays.add(jstDateKey(p.created_at as string));
    if (p.finished_at) activeDays.add(jstDateKey(p.finished_at as string));
  }

  // ストリーク: 今日(なければ昨日)から連続で「読書した日」が続く日数を数える
  let streakDays = 0;
  let cursor = today;
  if (!activeDays.has(today)) {
    // 今日まだなら昨日から数える(継続中とみなす)
    cursor = shiftKey(today, -1);
  }
  while (activeDays.has(cursor)) {
    streakDays += 1;
    cursor = shiftKey(cursor, -1);
  }

  return {
    todaySessions,
    todayMinutes,
    streakDays,
    readToday: activeDays.has(today),
  };
}

export interface MonthlyStats {
  year: number;
  month: number;
  finishedCount: number;
  finishedBooks: { title: string; author: string; genre: string | null }[];
  sessionCount: number;
  sessionMinutes: number;
  topGenres: { name: string; count: number }[];
}

// 今月(JST)の読書サマリー: 読了した本・ジャンル・集中セッションの合計。
export async function getMonthlyStats(userId: string): Promise<MonthlyStats> {
  const supabase = createClient();
  const now = new Date();
  const parts = now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }).split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const monthPrefix = `${parts[0]}-${parts[1]}`; // "YYYY-MM"

  const [{ data: posts }, { data: sessions }, { data: genres }] = await Promise.all([
    supabase
      .from("reading_posts")
      .select("reading_status, finished_at, created_at, book:books(title, author, genre_id)")
      .eq("user_id", userId)
      .eq("reading_status", "finished")
      .limit(500),
    supabase
      .from("reading_sessions")
      .select("duration_min, created_at")
      .eq("user_id", userId)
      .limit(500),
    supabase.from("genres").select("id, name"),
  ]);

  const genreName = new Map<string, string>((genres ?? []).map((g: any) => [g.id as string, g.name as string]));

  const finishedBooks: { title: string; author: string; genre: string | null }[] = [];
  const genreCounts = new Map<string, number>();
  for (const p of posts ?? []) {
    const when = (p.finished_at as string) || (p.created_at as string);
    if (!when || jstDateKey(when).slice(0, 7) !== monthPrefix) continue;
    const b = (p as { book?: { title?: string; author?: string; genre_id?: string } }).book;
    const gname = b?.genre_id ? genreName.get(b.genre_id) ?? null : null;
    finishedBooks.push({ title: b?.title ?? "", author: b?.author ?? "", genre: gname });
    if (gname) genreCounts.set(gname, (genreCounts.get(gname) ?? 0) + 1);
  }

  let sessionCount = 0;
  let sessionMinutes = 0;
  for (const s of sessions ?? []) {
    if (jstDateKey(s.created_at as string).slice(0, 7) !== monthPrefix) continue;
    sessionCount += 1;
    sessionMinutes += (s.duration_min as number) ?? 0;
  }

  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    year,
    month,
    finishedCount: finishedBooks.length,
    finishedBooks,
    sessionCount,
    sessionMinutes,
    topGenres,
  };
}
