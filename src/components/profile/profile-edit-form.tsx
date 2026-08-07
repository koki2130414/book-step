"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileEditSchema, type ProfileEditInput } from "@/lib/validations/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { updateProfile } from "@/app/(main)/profile/actions";
import type { Profile } from "@/types/database";

const GENRE_OPTIONS = ["ビジネス", "自己啓発", "教育", "心理学", "農業", "スポーツ", "小説"];

export function ProfileEditForm({ profile }: { profile: Profile }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedGenres, setSelectedGenres] = useState<string[]>(profile.favorite_genres ?? []);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileEditInput>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      displayName: profile.display_name,
      bio: profile.bio ?? "",
      avatarUrl: profile.avatar_url ?? "",
    },
  });

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  };

  const onSubmit = (values: ProfileEditInput) => {
    setFormError(null);
    startTransition(async () => {
      try {
        await updateProfile({ ...values, favoriteGenres: selectedGenres });
        showToast("プロフィールを更新しました");
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "更新に失敗しました");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="avatarUrl">プロフィール画像URL</Label>
        <Input id="avatarUrl" {...register("avatarUrl")} placeholder="https://" />
        <p className="text-xs text-ink/40">Supabase Storageへの画像アップロード機能は今後追加予定です(README参照)。</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="displayName">表示名</Label>
        <Input id="displayName" {...register("displayName")} />
        {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bio">自己紹介</Label>
        <Textarea id="bio" {...register("bio")} rows={4} />
      </div>
      <div className="space-y-1.5">
        <Label>好きなジャンル</Label>
        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS.map((genre) => (
            <button
              type="button"
              key={genre}
              onClick={() => toggleGenre(genre)}
              aria-pressed={selectedGenres.includes(genre)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selectedGenres.includes(genre) ? "border-forest-600 bg-forest-100 text-forest-700" : "border-beige-300 text-ink/60"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>
      {formError && <p className="text-sm text-destructive">{formError}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "保存中..." : "保存する"}
      </Button>
    </form>
  );
}
