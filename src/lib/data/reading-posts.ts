import { createClient } from "@/lib/supabase/server";
import type { ReadingPost } from "@/types/database";

const POST_SELECT = `
  *,
  book:books(*),
  author_profile:profiles!reading_posts_user_id_fkey(*)
`;

// 投稿一覧に「いいね数」「コメント数」「自分がいいね済みか」を付与する
async function attachEngagement(
  posts: ReadingPost[],
  currentUserId: string | null,
): Promise<ReadingPost[]> {
  if (posts.length === 0) return posts;
  const supabase = createClient();
  const postIds = posts.map((p) => p.id);

  const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
    supabase.from("likes").select("reading_post_id, user_id").in("reading_post_id", postIds),
    supabase.from("comments").select("reading_post_id").in("reading_post_id", postIds).eq("is_hidden", false),
  ]);

  return posts.map((post) => ({
    ...post,
    like_count: likeRows?.filter((l) => l.reading_post_id === post.id).length ?? 0,
    comment_count: commentRows?.filter((c) => c.reading_post_id === post.id).length ?? 0,
    liked_by_me: !!likeRows?.some((l) => l.reading_post_id === post.id && l.user_id === currentUserId),
  }));
}

// ホーム画面: 友達の投稿+自分の投稿を新着順に取得(RLSが可視範囲を保証する)
export async function getHomeFeed(userId: string): Promise<ReadingPost[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reading_posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("getHomeFeed error:", error.message);
    return [];
  }
  return attachEngagement((data ?? []) as unknown as ReadingPost[], userId);
}

export async function getMyShelf(userId: string): Promise<ReadingPost[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reading_posts")
    .select(POST_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMyShelf error:", error.message);
    return [];
  }
  return attachEngagement((data ?? []) as unknown as ReadingPost[], userId);
}

export async function getReadingPostById(id: string, currentUserId: string | null): Promise<ReadingPost | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("reading_posts").select(POST_SELECT).eq("id", id).single();
  if (error || !data) return null;
  const [withEngagement] = await attachEngagement([data as unknown as ReadingPost], currentUserId);
  return withEngagement;
}

interface SearchParams {
  query?: string;
  status?: string;
  genreId?: string;
  friendsOnly?: boolean;
  currentUserId: string;
}

export async function searchReadingPosts(params: SearchParams): Promise<ReadingPost[]> {
  const supabase = createClient();
  let queryBuilder = supabase.from("reading_posts").select(POST_SELECT);

  if (params.status) {
    queryBuilder = queryBuilder.eq("reading_status", params.status);
  }
  if (params.query) {
    // 本のタイトル・著者・要約・感想・学びを横断検索
    // Supabaseの生成した外部キー結合先(books)に対するor検索はRPC化が望ましいが、
    // MVPでは reading_posts側のテキスト項目のみを対象にシンプルに実装する
    queryBuilder = queryBuilder.or(
      `summary.ilike.%${params.query}%,review.ilike.%${params.query}%,learnings.ilike.%${params.query}%`,
    );
  }

  const { data, error } = await queryBuilder.order("created_at", { ascending: false }).limit(50);
  if (error) {
    console.error("searchReadingPosts error:", error.message);
    return [];
  }
  return attachEngagement((data ?? []) as unknown as ReadingPost[], params.currentUserId);
}

export async function getComments(postId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_user_id_fkey(*)")
    .eq("reading_post_id", postId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });
  return data ?? [];
}

// 同じ本を読んだ友達の投稿(RLSが可視範囲を保証するため、自分視点でそのまま取得できる)
export async function getFriendsWhoReadSameBook(bookId: string, excludePostId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("reading_posts")
    .select("*, author_profile:profiles!reading_posts_user_id_fkey(*)")
    .eq("book_id", bookId)
    .neq("id", excludePostId);
  return data ?? [];
}

// おすすめの本: 全体公開のうち評価が高い投稿から、自分がまだ登録していない本を抽出する
// (MVPでは高度なレコメンドアルゴリズムではなく、評価順のシンプルな選定にしている)
export async function getRecommendedBooks(userId: string, limit = 6): Promise<ReadingPost[]> {
  const supabase = createClient();

  const { data: myBookIdsRows } = await supabase.from("reading_posts").select("book_id").eq("user_id", userId);
  const myBookIds = new Set((myBookIdsRows ?? []).map((r) => r.book_id));

  const { data, error } = await supabase
    .from("reading_posts")
    .select(POST_SELECT)
    .eq("visibility", "public")
    .eq("is_hidden", false)
    .not("rating", "is", null)
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("getRecommendedBooks error:", error.message);
    return [];
  }

  const seenBooks = new Set<string>();
  const recommended: ReadingPost[] = [];
  for (const post of (data ?? []) as unknown as ReadingPost[]) {
    if (myBookIds.has(post.book_id) || seenBooks.has(post.book_id)) continue;
    seenBooks.add(post.book_id);
    recommended.push(post);
    if (recommended.length >= limit) break;
  }
  return attachEngagement(recommended, userId);
}
