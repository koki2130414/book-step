import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }),
  password: z.string().min(8, { message: "パスワードは8文字以上で入力してください" }),
  username: z
    .string()
    .min(3, { message: "ユーザー名は3文字以上で入力してください" })
    .max(20, { message: "ユーザー名は20文字以内で入力してください" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "ユーザー名は英数字とアンダースコアのみ使用できます" }),
  displayName: z.string().min(1, { message: "表示名を入力してください" }).max(30),
  bio: z.string().max(300).optional(),
  favoriteGenres: z.array(z.string()).optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }),
  password: z.string().min(1, { message: "パスワードを入力してください" }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
