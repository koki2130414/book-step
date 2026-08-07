import { notFound, redirect } from "next/navigation";
import { BookForm } from "@/components/books/book-form";
import { getActiveGenres } from "@/lib/data/genres";
import { getCurrentProfile } from "@/lib/data/profile";
import { getReadingPostById } from "@/lib/data/reading-posts";
import { updateReadingPost } from "@/app/(main)/books/actions";

export default async function EditBookPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const post = await getReadingPostById(params.id, profile.id);
  if (!post) notFound();
  if (post.user_id !== profile.id) redirect(`/books/${params.id}`);

  const genres = await getActiveGenres();

  const defaultValues = {
    title: post.book?.title ?? "",
    author: post.book?.author ?? "",
    isbn: post.book?.isbn13 ?? post.book?.isbn10 ?? "",
    coverImageUrl: post.book?.cover_image_url ?? "",
    publisher: post.book?.publisher ?? "",
    genreId: post.book?.genre_id ?? undefined,
    description: post.book?.description ?? "",
    readingStatus: post.reading_status,
    startedAt: post.started_at ?? "",
    finishedAt: post.finished_at ?? "",
    summary: post.summary ?? "",
    review: post.review ?? "",
    learnings: post.learnings ?? "",
    actionItems: post.action_items ?? "",
    memorableQuotes: post.memorable_quotes ?? "",
    rating: post.rating ?? undefined,
    visibility: post.visibility,
    summaryUrl: post.summary_url ?? "",
    youtubeUrl: post.youtube_url ?? "",
    amazonUrl: post.amazon_url ?? "",
    referenceUrl: post.reference_url ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">読書記録を編集する</h1>
        <p className="text-sm text-ink/50">書籍の基本情報は変更できません(別の本として登録し直してください)。</p>
      </div>
      <BookForm
        genres={genres}
        defaultValues={defaultValues as any}
        isEdit
        onSubmitAction={updateReadingPost.bind(null, post.id)}
      />
    </div>
  );
}
