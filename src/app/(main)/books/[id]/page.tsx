import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/shared/star-rating";
import { StatusBadge } from "@/components/shared/status-badge";
import { VisibilityBadge } from "@/components/shared/visibility-badge";
import { ExternalLinks } from "@/components/books/external-links";
import { LikeButton } from "@/components/books/like-button";
import { ReportDialog } from "@/components/books/report-dialog";
import { DeleteBookButton } from "@/components/books/delete-book-button";
import { RecommendToFriend } from "@/components/books/recommend-to-friend";
import { CommentSection } from "@/components/books/comment-section";
import { formatDate } from "@/lib/utils";
import { getCurrentProfile } from "@/lib/data/profile";
import { getFriendsList } from "@/lib/data/friends";
import { getReadingPostById, getComments, getFriendsWhoReadSameBook } from "@/lib/data/reading-posts";

export default async function BookDetailPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const post = await getReadingPostById(params.id, profile.id);
  if (!post) notFound();

  const [comments, friendsSameBook, friends] = await Promise.all([
    getComments(post.id),
    getFriendsWhoReadSameBook(post.book_id, post.id),
    getFriendsList(profile.id),
  ]);

  const isOwner = post.user_id === profile.id;
  const book = post.book;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex gap-4">
        <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-md bg-beige-100">
          {book?.cover_image_url ? (
            <Image src={book.cover_image_url} alt={`${book.title}の表紙`} fill className="object-cover" sizes="112px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-beige-300">
              <BookOpen size={32} />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={post.reading_status} />
            <VisibilityBadge visibility={post.visibility} />
          </div>
          <h1 className="font-display text-xl font-bold text-ink">{book?.title}</h1>
          <p className="text-sm text-ink/60">{book?.author}</p>
          {book?.publisher && (
            <p className="text-xs text-ink/40">{book.publisher} ・ {formatDate(book.published_date)}</p>
          )}
          {post.rating ? <StarRating value={post.rating} readOnly /> : null}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LikeButton postId={post.id} initialLiked={!!post.liked_by_me} initialCount={post.like_count ?? 0} />
          {book?.id && book?.title && (
            <RecommendToFriend
              bookId={book.id}
              bookTitle={book.title}
              friends={friends.map((f) => ({ id: f.id, username: f.username, displayName: f.display_name }))}
            />
          )}
          {!isOwner && <ReportDialog targetType="reading_post" targetId={post.id} />}
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/books/${post.id}/edit`}>
                <Pencil size={14} /> 編集する
              </Link>
            </Button>
            <DeleteBookButton postId={post.id} />
          </div>
        )}
      </div>

      {book?.description && (
        <section>
          <h2 className="mb-1 font-display font-semibold text-ink">本の概要</h2>
          <p className="whitespace-pre-wrap text-sm text-ink/70">{book.description}</p>
        </section>
      )}

      {post.summary && (
        <section>
          <h2 className="mb-1 font-display font-semibold text-ink">投稿者の要約</h2>
          <p className="whitespace-pre-wrap text-sm text-ink/70">{post.summary}</p>
        </section>
      )}
      {post.review && (
        <section>
          <h2 className="mb-1 font-display font-semibold text-ink">感想</h2>
          <p className="whitespace-pre-wrap text-sm text-ink/70">{post.review}</p>
        </section>
      )}
      {post.learnings && (
        <section>
          <h2 className="mb-1 font-display font-semibold text-ink">学んだこと</h2>
          <p className="whitespace-pre-wrap text-sm text-ink/70">{post.learnings}</p>
        </section>
      )}
      {post.action_items && (
        <section>
          <h2 className="mb-1 font-display font-semibold text-ink">実践したいこと</h2>
          <p className="whitespace-pre-wrap text-sm text-ink/70">{post.action_items}</p>
        </section>
      )}
      {post.memorable_quotes && (
        <section>
          <h2 className="mb-1 font-display font-semibold text-ink">印象に残った言葉</h2>
          <p className="whitespace-pre-wrap text-sm italic text-ink/70">「{post.memorable_quotes}」</p>
        </section>
      )}
      {post.finished_at && (
        <p className="text-sm text-ink/50">読了日: {formatDate(post.finished_at)}</p>
      )}

      <ExternalLinks
        postId={post.id}
        summaryUrl={post.summary_url}
        youtubeUrl={post.youtube_url}
        amazonUrl={post.amazon_url}
        referenceUrl={post.reference_url}
      />

      {friendsSameBook.length > 0 && (
        <section>
          <h2 className="mb-2 font-display font-semibold text-ink">同じ本を読んだ友達</h2>
          <ul className="space-y-2">
            {friendsSameBook.map((p: any) => (
              <li key={p.id}>
                <Link href={`/books/${p.id}`} className="flex items-center justify-between rounded-md border border-beige-200 p-3 text-sm hover:bg-beige-50">
                  <span>{p.author_profile?.display_name}</span>
                  <StatusBadge status={p.reading_status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CommentSection postId={post.id} comments={comments as any} currentUserId={profile.id} postOwnerId={post.user_id} />
    </div>
  );
}
