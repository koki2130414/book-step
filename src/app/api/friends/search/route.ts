import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchUsers, getFriendshipStatus } from "@/lib/data/friends";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ users: [] });

  const users = await searchUsers(query, user.id);
  const usersWithStatus = await Promise.all(
    users.map(async (u) => ({ ...u, friendshipStatus: (await getFriendshipStatus(user.id, u.id))?.status ?? null })),
  );

  return NextResponse.json({ users: usersWithStatus });
}
