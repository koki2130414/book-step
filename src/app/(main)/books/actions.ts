"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readingPostSchema, commentSchema, type ReadingPostInput } from "@/lib/validations/book";

// books.title / books.author は NOT NULL 制約のため、未入力の場合は仮の値を補う
// (タイトル未入力でも登録できるようにするためのMVPの割り切り。後から編集で埋められる)
const UNTITLED_PLACEHOLDER = "タイトル未設定";
const UNKNOWN_AUTHOR_PLACEHOLDER = "著者不明";

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
      published_date: input.publishedDate || null,
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

  revalidatePath(`/books/${postId}`);
  revalidatePath("/shelf");
  redirect(`/books/${postId}`);
}

export async function deleteReadingPost(postId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("reading_posts").delete().eq("id", postId);
  if (error) throw new Error(`削除に失敗しました: ${error.message}`);
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
