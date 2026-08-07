"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { suspendUser } from "@/app/(main)/admin/actions";

export function UserRowActions({ userId, status }: { userId: string; status: "active" | "suspended" }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const isSuspended = status === "suspended";

  return (
    <Button
      size="sm"
      variant={isSuspended ? "secondary" : "destructive"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await suspendUser(userId, !isSuspended);
            showToast(isSuspended ? "利用停止を解除しました" : "ユーザーを利用停止にしました");
          } catch (e) {
            showToast(e instanceof Error ? e.message : "操作に失敗しました", "error");
          }
        })
      }
    >
      {isSuspended ? "利用停止を解除" : "利用停止にする"}
    </Button>
  );
}
