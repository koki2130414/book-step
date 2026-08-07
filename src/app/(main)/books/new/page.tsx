import { BookForm } from "@/components/books/book-form";
import { getActiveGenres } from "@/lib/data/genres";
import { createReadingPost } from "@/app/(main)/books/actions";

export default async function NewBookPage() {
  const genres = await getActiveGenres();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">本を登録する</h1>
        <p className="text-sm text-ink/50">読んだ本、読みたい本を記録して友達と共有しましょう。</p>
      </div>
      <BookForm genres={genres} onSubmitAction={createReadingPost} />
    </div>
  );
}
