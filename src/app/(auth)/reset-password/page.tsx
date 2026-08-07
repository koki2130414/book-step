"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/constants";

export default function ResetPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetPasswordInput) => {
    setIsSubmitting(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });
    setIsSubmitting(false);
    setSent(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="font-display text-xl font-bold text-forest-700">{APP_NAME}</p>
          <p className="text-sm text-ink/50">パスワード再設定</p>
        </div>

        {sent ? (
          <p className="rounded-md bg-forest-50 p-4 text-center text-sm text-forest-700">
            パスワード再設定用のメールを送信しました。メールをご確認ください。
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">登録済みのメールアドレス</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "送信中..." : "再設定メールを送る"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
