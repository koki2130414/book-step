import { ShelfView } from "@/components/books/shelf-view";
import { getCurrentProfile } from "@/lib/data/profile";
import { getMyShelf } from "@/lib/data/reading-posts";

export default async function ShelfPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const posts = await getMyShelf(profile.id);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold text-ink">マイ本棚</h1>
      <ShelfView posts={posts} />
    </div>
  );
}
