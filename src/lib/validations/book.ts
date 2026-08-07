import { z } from "zod";
import { isSafeUrl } from "@/lib/utils";

const safeUrlField = z
  .string()
  .optional()
  .refine((val) => isSafeUrl(val), { message: "有効なURL(http/https)を入力してください" });

// 空文字列は「未入力」として扱い、数値バリデーションでエラーにしない
const optionalPositiveInt = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().positive().optional(),
);
const optionalRating = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().min(1).max(5).optional(),
);

export const readingPostSchema = z.object({
  // 書籍情報(新規登録 or 既存書籍IDのどちらか)。
  // タイトル・著者名も未入力のまま登録できるよう任意項目にしている(未入力時はサーバー側で仮の値を補う)
  bookId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
  author: z.string().max(120).optional(),
  isbn: z.string().max(20).optional(),
  coverImageUrl: safeUrlField,
  publisher: z.string().max(120).optional(),
  publishedDate: z.string().optional(),
  genreId: z.string().uuid().optional().nullable(),
  pageCount: optionalPositiveInt,
  description: z.string().max(2000).optional(),

  // 読書記録情報(readingStatus/visibilityはフォーム側で常にデフォルト値が入るため未入力でも問題ない)
  readingStatus: z.enum(["want_to_read", "reading", "finished", "paused", "reread_wanted"]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  summary: z.string().max(3000).optional(),
  review: z.string().max(3000).optional(),
  learnings: z.string().max(3000).optional(),
  actionItems: z.string().max(1000).optional(),
  memorableQuotes: z.string().max(1000).optional(),
  rating: optionalRating,
  visibility: z.enum(["public", "friends_only", "private"]),
  summaryUrl: safeUrlField,
  youtubeUrl: safeUrlField,
  amazonUrl: safeUrlField,
  referenceUrl: safeUrlField,
});
export type ReadingPostInput = z.infer<typeof readingPostSchema>;

export const commentSchema = z.object({
  content: z.string().min(1, "コメントを入力してください").max(500, "コメントは500文字以内で入力してください"),
});
export type CommentInput = z.infer<typeof commentSchema>;
