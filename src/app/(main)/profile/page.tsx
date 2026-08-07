import Link from "next/link";
import { Pencil, BookMarked, BookOpen, Users, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/books/book-card";
import { getCurrentProfile, getProfileStats } from "@/lib/data/profile";
import { getMyShelf } from "@/lib/data/reading-posts";

export default async function MyProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [stats, shelf] = await Promise.all([getProfileStats(profile.id), getMyShelf(profile.id)]);
  const recentlyRead = shelf.filter((p) => p.reading_status === "finished").slice(0, 4);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-xl">{profile.display_name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">{profile.display_name}</h1>
            <p className="text-sm text-ink/50">@{profile.username}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/profile/edit"><Pencil size={14} /> 編集</Link>
        </Button>
      </div>

      {profile.bio && <p className="whitespace-pre-wrap text-sm text-ink/70">{profile.bio}</p>}

      {profile.favorite_genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.favorite_genres.map((g) => (
            <span key={g} className="rounded-full bg-beige-100 px-3 py-1 text-xs text-clay-600">{g}</span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-beige-200 p-3">
          <BookMarked className="mx-auto mb-1 text-forest-600" size={18} />
          <p className="font-display text-lg font-bold text-ink">{stats.finishedCount}</p>
          <p className="text-xs text-ink/50">読了冊数</p>
        </div>
        <div className="rounded-lg border border-beige-200 p-3">
          <BookOpen className="mx-auto mb-1 text-forest-600" size={18} />
          <p className="font-display text-lg font-bold text-ink">{stats.readingCount}</p>
          <p className="text-xs text-ink/50">読書中</p>
        </div>
        <div className="rounded-lg border border-beige-200 p-3">
          <Users className="mx-auto mb-1 text-forest-600" size={18} />
          <p className="font-display text-lg font-bold text-ink">{stats.friendCount}</p>
          <p className="text-xs text-ink/50">友達数</p>
        </div>
      </div>

      <Button asChild variant="secondary" className="w-full">
        <Link href="/goals"><Target size={16} /> 読書目標を設定する</Link>
      </Button>

      {recentlyRead.length > 0 && (
        <section>
          <h2 className="mb-3 font-display font-semibold text-ink">最近読んだ本</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentlyRead.map((post) => <BookCard key={post.id} post={post} />)}
          </div>
        </section>
      )}
    </div>
  );
}
