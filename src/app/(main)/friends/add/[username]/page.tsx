import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddFriendByProfile } from "@/components/friends/add-friend-by-profile";
import { getCurrentProfile } from "@/lib/data/profile";
import { getProfileByUsernameExact, getFriendshipStatus } from "@/lib/data/friends";

// ユーザー名(ID)直接指定 or QRコード読み取り後の遷移先。
// URLを開くだけで相手のプロフィールが確認でき、その場で友達申請を送れる
export default async function AddFriendByIdPage({ params }: { params: { username: string } }) {
  const me = await getCurrentProfile();
  if (!me) return null;

  const target = await getProfileByUsernameExact(decodeURIComponent(params.username));
  if (!target) notFound();

  const isSelf = target.id === me.id;
  const friendship = isSelf ? null : await getFriendshipStatus(me.id, target.id);

  return (
    <div className="mx-auto max-w-sm space-y-6 text-center">
      <Avatar className="mx-auto h-20 w-20">
        <AvatarImage src={target.avatar_url ?? undefined} alt="" />
        <AvatarFallback className="text-2xl">{target.display_name[0]}</AvatarFallback>
      </Avatar>
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{target.display_name}</h1>
        <p className="text-sm text-ink/50">@{target.username}</p>
      </div>
      {target.bio && <p className="text-sm text-ink/70">{target.bio}</p>}

      <AddFriendByProfile
        targetId={target.id}
        targetUsername={target.username}
        isSelf={isSelf}
        initialStatus={friendship?.status ?? null}
      />
    </div>
  );
}
