import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, BookOpen } from "lucide-react";
import { StarRating } from "@/components/shared/star-rating";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import type { ReadingPost } from "@/types/database";

interface BookCardProps {
  post: ReadingPost;
}

// ホーム/本棚/検索結果で共通して使う投稿カード
export function BookCard({ post }: BookCardProps) {
  const book = post.book;
  const author = post.author_profile;

  return (
    <Link
      href={`/books/${post.id}`}
      className="flex gap-3 rounded-lg border border-beige-200 bg-paper p-3 transition-shadow hover:shadow-md"
    >
      <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md bg-beige-100">
        {book?.cover_image_url ? (
          <Image src={book.cover_image_url} alt={`${book.title}の表紙`} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-beige-300">
            <BookOpen size={24} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={post.reading_status} />
          {post.rating ? <StarRating value={post.rating} readOnly size={14} /> : null}
        </div>
        <p className="truncate font-display font-semibold text-ink">{book?.title}</p>
        <p className="truncate text-xs text-ink/60">{book?.author}</p>
        {post.summary && <p className="line-clamp-2 text-sm text-ink/70">{post.summary}</p>}

        <div className="mt-auto flex items-center justify-between pt-1 text-xs text-ink/50">
          <span>{author?.display_name ?? "投稿者"} ・ {formatDate(post.created_at)}</span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <Heart size={12} /> {post.like_count ?? 0}
            </span>
            <span className="flex items-center gap-0.5">
              <MessageCircle size={12} /> {post.comment_count ?? 0}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
