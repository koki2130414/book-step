import { z } from "zod";
import { isSafeUrl } from "@/lib/utils";

const safeUrlField = z
  .string()
  .optional()
  .refine((val) => isSafeUrl(val), { message: "有効なURL(http/https)を入力してください" });

export const readingPostSchema = z.object({
  // 書籍情報(新規登録 or 既存書籍IDのどちらか)
  bookId: z.string().uuid().optional(),
  title: z.string().min(1, "タイトルを入力してください").max(200),
  author: z.string().min(1, "著者名を入力してください").max(120),
  isbn: z.string().max(20).optional(),
  coverImageUrl: safeUrlField,
  publisher: z.string().max(120).optional(),
  publishedDate: z.string().optional(),
  genreId: z.string().uuid().optional().nullable(),
  pageCount: z.coerce.number().int().positive().optional(),
  description: z.string().max(2000).optional(),

  // 読書記録情報
  readingStatus: z.enum(["want_to_read", "reading", "finished", "paused", "reread_wanted"]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  summary: z.string().max(3000).optional(),
  review: z.string().max(3000).optional(),
  learnings: z.string().max(3000).optional(),
  actionItems: z.string().max(1000).optional(),
  memorableQuotes: z.string().max(1000).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
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
