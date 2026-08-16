"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readingPostSchema, commentSchema, type ReadingPostInput } from "@/lib/validations/book";

// books.title / books.author は NOT NULL 制約のため、未入力の場合は仮の値を補う
// (タイトル未入力でも登録できるようにするためのMVPの割り切り。後から編集で埋められる)
const UNTITLED_PLACEHOLDER = "タイトル未設定";
const UNKNOWN_AUTHOR_PLACEHOLDER = "著者不明";

// Google Books等の外部APIは published_date を "2018" や "2018-08" のように
// 部分的な値で返すことがある。books.published_date は DATE 型のため、そのまま渡すと
// INSERTがエラーになる(500)。YYYY-MM-DD形式へ正規化し、不明な月日は "01" で補う。
// 解釈できない値は null にして登録自体は成功させる。
function normalizePublishedDate(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})$/))) {
    return `${m[1]}-${m[2].padStart(2, "0")}-01`;
  }
  if ((m = s.match(/^(\d{4})$/))) {
    return `${m[1]}-01-01`;
  }
  return null;
}

// 書籍情報を検索し、既存(ISBN一致)があれば再利用、なければ新規作成する
async function findOrCreateBook(input: ReadingPostInput, userId: string) {
  const supabase = createClient();
  const isbnDigits = input.isbn?.replace(/-/g, "");

  if (isbnDigits) {
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .or(`isbn13.eq.${isbnDigits},isbn10.eq.${isbnDigits}`)
      .maybeSingle();
    if (existing) return existing.id as string;
  }

  const isbn13 = isbnDigits && isbnDigits.length === 13 ? isbnDigits : null;
  const isbn10 = isbnDigits && isbnDigits.length === 10 ? isbnDigits : null;

  const { data: created, error } = await supabase
    .from("books")
    .insert({
      title: input.title?.trim() || UNTITLED_PLACEHOLDER,
      author: input.author?.trim() || UNKNOWN_AUTHOR_PLACEHOLDER,
      isbn13,
      isbn10,
      cover_image_url: input.coverImageUrl || null,
      publisher: input.publisher || null,
      published_date: normalizePublishedDate(input.publishedDate),
      description: input.description || null,
      page_count: input.pageCount || null,
      genre_id: input.genreId || null,
      external_source: "manual",
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(`書籍の登録に失敗しました: ${error.message}`);
  return created.id as string;
}

export async function createReadingPost(rawInput: ReadingPostInput) {
  const input = readingPostSchema.parse(rawInput);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const bookId = await findOrCreateBook(input, user.id);

  const { data: post, error } = await supabase
    .from("reading_posts")
    .insert({
      user_id: user.id,
      book_id: bookId,
      reading_status: input.readingStatus,
      started_at: input.startedAt || null,
      finished_at: input.finishedAt || null,
      summary: input.summary || null,
      review: input.review || null,
      learnings: input.learnings || null,
      action_items: input.actionItems || null,
      memorable_quotes: input.memorableQuotes || null,
      rating: input.rating || null,
      visibility: input.visibility,
      summary_url: input.summaryUrl || null,
      youtube_url: input.youtubeUrl || null,
      amazon_url: input.amazonUrl || null,
      reference_url: input.referenceUrl || null,
    })
    .select("id")
    .single();

  if (error) {
    // 同じ本を既に登録済み(unique制約違反)の場合はわかりやすいメッセージにする
    if (error.code === "23505") {
      throw new Error("この本は既に登録済みです。マイ本棚から編集してください。");
    }
    throw new Error(`読書記録の登録に失敗しました: ${error.message}`);
  }

  revalidatePath("/home");
  revalidatePath("/shelf");
  redirect(`/books/${post.id}`);
}

export async function updateReadingPost(postId: string, rawInput: ReadingPostInput) {
  const input = readingPostSchema.parse(rawInput);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("reading_posts")
    .update({
      reading_status: input.readingStatus,
      started_at: input.startedAt || null,
      finished_at: input.finishedAt || null,
      summary: input.summary || null,
      review: input.review || null,
      learnings: input.learnings || null,
      action_items: input.actionItems || null,
      memorable_quotes: input.memorableQuotes || null,
      rating: input.rating || null,
      visibility: input.visibility,
      summary_url: input.summaryUrl || null,
      youtube_url: input.youtubeUrl || null,
      amazon_url: input.amazonUrl || null,
      reference_url: input.referenceUrl || null,
    })
    .eq("id", postId)
    .eq("user_id", user.id); // RLSでも保護されるが明示しておく

  if (error) throw new Error(`更新に失敗しました: ${error.message}`);

  // 表紙画像の追加・変更に対応する。書籍の基本情報は編集不可だが、表紙だけは
  // 後から差し替えられるようにする(自分が登録した書籍のみRLSで更新可能)。
  if (input.coverImageUrl) {
    const { data: postRow } = await supabase
      .from("reading_posts")
      .select("book_id")
      .eq("id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (postRow?.book_id) {
      // 他ユーザーが登録した共有書籍はRLSで更新されない(ベストエフォート)
      await supabase
        .from("books")
        .update({ cover_image_url: input.coverImageUrl })
        .eq("id", postRow.book_id);
    }
  }

  revalidatePath(`/books/${postId}`);
  revalidatePath("/shelf");
  redirect(`/books/${postId}`);
}

export async function deleteReadingPost(postId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  // RLSでも保護されるが、明示的に自分の記録のみ削除対象にする
  // (いいね・コメント等の関連データはFKのon delete cascadeで自動削除される)
  const { error } = await supabase.from("reading_posts").delete().eq("id", postId).eq("user_id", user.id);
  if (error) throw new Error(`削除に失敗しました: ${error.message}`);

  revalidatePath("/home");
  revalidatePath("/shelf");
  redirect("/shelf");
}

export async function toggleLike(postId: string, currentlyLiked: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  if (currentlyLiked) {
    await supabase.from("likes").delete().eq("user_id", user.id).eq("reading_post_id", postId);
  } else {
    await supabase.from("likes").insert({ user_id: user.id, reading_post_id: postId });
  }
  revalidatePath(`/books/${postId}`);
}

export async function addComment(postId: string, rawInput: { content: string }) {
  const input = commentSchema.parse(rawInput);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("comments").insert({
    user_id: user.id,
    reading_post_id: postId,
    content: input.content,
  });
  if (error) throw new Error(`コメントの投稿に失敗しました: ${error.message}`);
  revalidatePath(`/books/${postId}`);
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) throw new Error(`コメントの削除に失敗しました: ${error.message}`);
  revalidatePath(`/books/${postId}`);
}

export async function recordLinkClick(postId: string, linkType: "summary" | "youtube" | "amazon" | "reference") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("link_click_events").insert({
    reading_post_id: postId,
    link_type: linkType,
    user_id: user?.id ?? null,
  });
}

export async function reportContent(input: {
  targetType: "reading_post" | "comment" | "user";
  targetId: string;
  reason: string;
  description?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    description: input.description || null,
  });
  if (error) throw new Error(`通報の送信に失敗しました: ${error.message}`);
}
