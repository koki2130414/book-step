import { z } from "zod";

export const personalGoalSchema = z.object({
  title: z.string().min(1, "目標のタイトルを入力してください").max(100),
  description: z.string().max(1000).optional(),
  deadline: z.string().optional(),
  visibility: z.enum(["public", "friends_only", "private"]).default("friends_only"),
});
export type PersonalGoalInput = z.infer<typeof personalGoalSchema>;

export const goalMessageSchema = z.object({
  message: z.string().min(1, "メッセージを入力してください").max(500),
});
export type GoalMessageInput = z.infer<typeof goalMessageSchema>;
