"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import {
  createPersonalGoal,
  updateGoalProgress,
  deletePersonalGoal,
  sendGoalMessage,
} from "@/app/(main)/goals/actions";
import type { VisibilityLevel } from "@/types/database";

// 目標の新規作成フォーム
export function GoalCreateForm() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [visibility, setVisibility] = useState<VisibilityLevel>("friends_only");

  const submit = () => {
    if (!title.trim()) {
      showToast("目標のタイトルを入力してください", "error");
      return;
    }
    startTransition(async () => {
      try {
        await createPersonalGoal({ title, description, deadline, visibility });
        setTitle("");
        setDescription("");
        setDeadline("");
        setVisibility("friends_only");
        showToast("目標を作成しました");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "作成に失敗しました", "error");
      }
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-beige-200 bg-beige-50/60 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="goal-title">目標のタイトル *</Label>
        <Input
          id="goal-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 毎日30分運動する"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="goal-desc">詳細(任意)</Label>
        <Textarea
          id="goal-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="どんな目標か、なぜ達成したいかなど"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="goal-deadline">期限(任意)</Label>
          <Input
            id="goal-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-visibility">公開範囲</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as VisibilityLevel)}>
            <SelectTrigger id="goal-visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friends_only">友達のみ</SelectItem>
              <SelectItem value="public">全体公開</SelectItem>
              <SelectItem value="private">非公開</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button className="w-full" onClick={submit} disabled={isPending}>
        {isPending ? "作成中..." : "目標を作成する"}
      </Button>
    </div>
  );
}

// 進捗更新(本人のみ)
export function GoalProgressControl({
  goalId,
  initialProgress,
}: {
  goalId: string;
  initialProgress: number;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialProgress);

  const save = () => {
    startTransition(async () => {
      try {
        await updateGoalProgress(goalId, value);
        showToast("進捗を更新しました");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "更新に失敗しました", "error");
      }
    });
  };

  return (
    <div className="space-y-2">
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-forest-600"
        aria-label="進捗"
      />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{value}%</span>
        <Button size="sm" onClick={save} disabled={isPending}>
          {isPending ? "保存中..." : "進捗を更新"}
        </Button>
      </div>
    </div>
  );
}

// 目標の削除(本人のみ)
export function GoalDeleteButton({ goalId }: { goalId: string }) {
  const { showToast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const remove = () => {
    startTransition(async () => {
      try {
        await deletePersonalGoal(goalId);
        showToast("目標を削除しました");
        router.push("/goals");
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "削除に失敗しました", "error");
      }
    });
  };

  return (
    <Button variant="ghost" size="sm" onClick={remove} disabled={isPending} aria-label="削除">
      <Trash2 size={16} />
      削除
    </Button>
  );
}

// 応援メッセージの送信(友達)
export function GoalMessageForm({ goalId }: { goalId: string }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!message.trim()) return;
    startTransition(async () => {
      try {
        await sendGoalMessage(goalId, { message });
        setMessage("");
        showToast("応援メッセージを送りました");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "送信に失敗しました", "error");
      }
    });
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="応援メッセージを送る"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={isPending}>
          {isPending ? "送信中..." : "送信"}
        </Button>
      </div>
    </div>
  );
}
