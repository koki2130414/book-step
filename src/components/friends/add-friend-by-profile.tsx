"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Clock, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { sendFriendRequest } from "@/app/(main)/friends/actions";
import type { FriendshipStatus } from "@/types/database";

interface AddFriendByProfileProps {
  targetId: string;
  targetUsername: string;
  isSelf: boolean;
  initialStatus: FriendshipStatus | null;
}

// 相手プロフィールを見ながら友達申請を送るボタン(ID直接指定・QR経由の両方から使う)
export function AddFriendByProfile({ targetId, targetUsername, isSelf, initialStatus }: AddFriendByProfileProps) {
  const { showToast } = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  if (isSelf) {
    return <p className="text-sm text-ink/50">これはあなた自身のプロフィールです。</p>;
  }

  if (status === "accepted") {
    return (
      <div className="space-y-3">
        <p className="flex items-center justify-center gap-1 text-sm text-forest-700">
          <Check size={16} /> すでに友達です
        </p>
        <Button asChild variant="secondary" className="w-full">
          <Link href={`/profile/${targetUsername}`}>プロフィールを見る</Link>
        </Button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <p className="flex items-center justify-center gap-1 text-sm text-ink/50">
        <Clock size={16} /> 申請中です
      </p>
    );
  }

  return (
    <Button
      className="w-full"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await sendFriendRequest(targetId);
            setStatus("pending");
            showToast("友達申請を送りました");
          } catch (e) {
            showToast(e instanceof Error ? e.message : "申請に失敗しました", "error");
          }
        })
      }
    >
      <UserPlus size={16} className={isPending ? "hidden" : undefined} />
      {isPending && <Loader2 className="animate-spin" size={16} />}
      友達申請を送る
    </Button>
  );
}
