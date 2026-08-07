import { z } from "zod";

export const profileEditSchema = z.object({
  displayName: z.string().min(1, "表示名を入力してください").max(30),
  bio: z.string().max(300).optional(),
  favoriteGenres: z.array(z.string()).optional(),
  avatarUrl: z.string().optional(),
});
export type ProfileEditInput = z.infer<typeof profileEditSchema>;

export const readingGoalSchema = z.object({
  goalType: z.enum(["monthly", "yearly"]),
  targetCount: z.coerce.number().int().positive("1以上の数値を入力してください"),
  targetYear: z.coerce.number().int(),
  targetMonth: z.coerce.number().int().min(1).max(12).optional(),
});
export type ReadingGoalInput = z.infer<typeof readingGoalSchema>;
