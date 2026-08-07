"use client";
import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { reportContent } from "@/app/(main)/books/actions";

const REASONS = [
  { value: "spam", label: "スパム・宣伝" },
  { value: "inappropriate", label: "不適切な内容" },
  { value: "copyright", label: "著作権侵害の疑い" },
  { value: "harassment", label: "誹謗中傷" },
  { value: "other", label: "その他" },
];

interface ReportDialogProps {
  targetType: "reading_post" | "comment" | "user";
  targetId: string;
}

// 投稿・コメント・ユーザーへの通報ダイアログ(管理画面の通報一覧に反映される)
export function ReportDialog({ targetType, targetId }: ReportDialogProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        await reportContent({ targetType, targetId, reason, description });
        showToast("通報を送信しました。ご協力ありがとうございます。");
        setOpen(false);
        setDescription("");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "通報の送信に失敗しました", "error");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="通報する"
          className="flex items-center gap-1 text-xs text-ink/40 hover:text-destructive"
        >
          <Flag size={13} /> 通報する
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-paper p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="font-display font-semibold text-ink">通報する</Dialog.Title>
            <Dialog.Close aria-label="閉じる"><X size={18} /></Dialog.Close>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-reason">理由</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="report-reason"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-description">詳細(任意)</Label>
              <Textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="状況を具体的に教えてください"
              />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={isPending} variant="destructive">
              {isPending ? "送信中..." : "通報を送信する"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
