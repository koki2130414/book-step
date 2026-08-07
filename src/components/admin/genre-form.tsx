"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { upsertGenre } from "@/app/(main)/admin/actions";

export function GenreForm() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await upsertGenre({ name, slug, sortOrder: 99, isActive: true });
        setName("");
        setSlug("");
        showToast("ジャンルを追加しました");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "追加に失敗しました", "error");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="genre-name">ジャンル名</Label>
        <Input id="genre-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="genre-slug">slug(英字)</Label>
        <Input id="genre-slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </div>
      <Button type="submit" disabled={isPending}>追加</Button>
    </form>
  );
}
