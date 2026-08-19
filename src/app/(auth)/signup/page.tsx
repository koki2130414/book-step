"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { APP_NAME } from "@/lib/constants";

const GENRE_OPTIONS = ["ビジネス", "自己啓発", "教育", "心理学", "農業", "スポーツ", "小説"];

export default function SignUpPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  };

  const onSubmit = async (values: SignUpInput) => {
    setServerError(null);
    setIsSubmitting(true);
    const supabase = createClient();
    // profiles テーブルへの行作成は DBトリガー(handle_new_user)が自動で行う。
    // ユーザー名・表示名はメタデータとして渡し、トリガー側で参照する
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          username: values.username,
          display_name: values.displayName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setIsSubmitting(false);
    if (error) {
      setServerError(
        error.message.includes("already registered")
          ? "このメールアドレスは既に登録されています。"
          : "登録に失敗しました。時間をおいて再度お試しください。",
      );
      return;
    }

    // 自己紹介・興味ジャンルは profiles 作成後に別途更新する(トリガーはusername/display_nameのみ処理するため)
    if (data.session && (values.bio || selectedGenres.length > 0)) {
      await supabase
        .from("profiles")
        .update({ bio: values.bio ?? null, favorite_genres: selectedGenres })
        .eq("id", data.session.user.id);
    }

    // メール確認が不要な設定ならサインアップ時点でセッションが発行される。
    // その場合は確認メールを待たせず、そのままアプリへ入れる。
    if (data.session) {
      showToast("登録が完了しました。");
      router.push("/home");
      router.refresh();
    } else {
      // メール確認が必要な設定の場合のみ、メール案内を表示する
      showToast("確認メールを送信しました。メール内のリンクから登録を完了してください。");
      router.push("/login");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="font-display text-xl font-bold text-forest-700">{APP_NAME}</p>
          <p className="text-sm text-ink/50">新規登録</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">パスワード</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">ユーザー名(半角英数字)</Label>
            <Input id="username" {...register("username")} placeholder="taro_yamada" />
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">表示名</Label>
            <Input id="displayName" {...register("displayName")} placeholder="山田太郎" />
            {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">自己紹介(任意)</Label>
            <Textarea id="bio" {...register("bio")} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>興味のある本のジャンル(任意)</Label>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((genre) => (
                <button
                  type="button"
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  aria-pressed={selectedGenres.includes(genre)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    selectedGenres.includes(genre)
                      ? "border-forest-600 bg-forest-100 text-forest-700"
                      : "border-beige-300 text-ink/60"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "登録中..." : "無料で始める"}
          </Button>
        </form>

        <p className="text-center text-sm">
          既にアカウントをお持ちの方は <Link href="/login" className="text-forest-700 hover:underline">ログイン</Link>
        </p>
      </div>
    </main>
  );
}
