import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchReadingPosts } from "@/lib/data/reading-posts";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const posts = await searchReadingPosts({
    query: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    currentUserId: user.id,
  });

  return NextResponse.json({ posts });
}
