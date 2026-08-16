"use client";
import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { deleteReadingPost } from "@/app/(main)/books/actions";

// 自分の読書記録を削除するボタン(確認ダイアログ付き)。削除成功時はサーバー側で/shelfへリダイレクトされる
export function DeleteBookButton({ postId }: { postId: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteReadingPost(postId);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "削除に失敗しました", "error");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 size={14} /> 削除する
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-paper p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="font-display font-semibold text-ink">この記録を削除しますか？</Dialog.Title>
            <Dialog.Close aria-label="閉じる">
              <X size={18} />
            </Dialog.Close>
          </div>
          <p className="mb-5 text-sm text-ink/70">
            この読書記録を削除します。ついた「いいね」やコメントも一緒に削除され、この操作は取り消せません。
          </p>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                キャンセル
              </Button>
            </Dialog.Close>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
              {isPending ? "削除中..." : "削除する"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
