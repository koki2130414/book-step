"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    setIsSubmitting(false);
    if (error) {
      setServerError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }
    showToast("ログインしました");
    router.push(searchParams.get("next") ?? "/home");
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="font-display text-xl font-bold text-forest-700">{APP_NAME}</p>
          <p className="text-sm text-ink/50">{APP_TAGLINE}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">パスワード</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
          Googleでログイン
        </Button>

        <div className="flex justify-between text-sm">
          <Link href="/reset-password" className="text-forest-700 hover:underline">パスワードを忘れた方</Link>
          <Link href="/signup" className="text-forest-700 hover:underline">新規登録はこちら</Link>
        </div>
      </div>
    </main>
  );
}
