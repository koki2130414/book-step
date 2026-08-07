import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllMembers, getFriendshipStatus } from "@/lib/data/friends";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const offset = Number(searchParams.get("offset") ?? "0");

  const { members, hasMore } = await getAllMembers(user.id, PAGE_SIZE, offset);
  const membersWithStatus = await Promise.all(
    members.map(async (m) => ({ ...m, friendshipStatus: (await getFriendshipStatus(user.id, m.id))?.status ?? null })),
  );

  return NextResponse.json({ members: membersWithStatus, hasMore, nextOffset: offset + PAGE_SIZE });
}
