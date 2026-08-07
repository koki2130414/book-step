"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { createAnnouncement } from "@/app/(main)/admin/actions";

export function AnnouncementForm() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createAnnouncement({ title, body });
        setTitle("");
        setBody("");
        showToast("お知らせを配信しました");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "配信に失敗しました", "error");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="ann-title">タイトル</Label>
        <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ann-body">本文</Label>
        <Textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} required />
      </div>
      <Button type="submit" disabled={isPending}>配信する</Button>
    </form>
  );
}
