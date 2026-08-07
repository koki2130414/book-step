"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { resolveReport } from "@/app/(main)/admin/actions";

export function ReportRowActions({ reportId }: { reportId: string }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handle = (status: "reviewed" | "dismissed") =>
    startTransition(async () => {
      try {
        await resolveReport(reportId, status);
        showToast("通報を処理しました");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "処理に失敗しました", "error");
      }
    });

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={isPending} onClick={() => handle("reviewed")}>対応済みにする</Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => handle("dismissed")}>却下する</Button>
    </div>
  );
}
