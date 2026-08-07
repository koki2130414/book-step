"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { commentSchema, type CommentInput } from "@/lib/validations/book";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { addComment, deleteComment } from "@/app/(main)/books/actions";
import type { Comment } from "@/types/database";

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  currentUserId: string;
  postOwnerId: string;
}

export function CommentSection({ postId, comments, currentUserId, postOwnerId }: CommentSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentInput>({ resolver: zodResolver(commentSchema) });

  const onSubmit = (values: CommentInput) => {
    setFormError(null);
    startTransition(async () => {
      try {
        await addComment(postId, values);
        reset();
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "投稿に失敗しました");
      }
    });
  };

  // 自分のコメント、または自分の投稿についたコメントのみ削除ボタンを表示
  const canDelete = (comment: Comment) => comment.user_id === currentUserId || postOwnerId === currentUserId;

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-ink">コメント({comments.length})</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <Textarea placeholder="コメントを入力..." rows={2} {...register("content")} />
        {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
        {formError && <p className="text-xs text-destructive">{formError}</p>}
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "送信中..." : "コメントする"}
        </Button>
      </form>

      <ul className="space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="flex items-start justify-between gap-2 rounded-md bg-beige-50/60 p-3">
            <div>
              <p className="text-sm font-medium text-ink">{comment.author?.display_name}</p>
              <p className="text-sm text-ink/80">{comment.content}</p>
              <p className="text-xs text-ink/40">{formatDate(comment.created_at)}</p>
            </div>
            {canDelete(comment) && (
              <button
                type="button"
                aria-label="コメントを削除"
                onClick={() => startTransition(() => deleteComment(comment.id, postId))}
                className="text-ink/30 hover:text-destructive"
              >
                <Trash2 size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
