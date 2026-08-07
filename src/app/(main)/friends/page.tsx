import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FriendSearch } from "@/components/friends/friend-search";
import { FriendRequestList } from "@/components/friends/friend-request-list";
import { FriendList } from "@/components/friends/friend-list";
import { MemberList } from "@/components/friends/member-list";
import { AddFriendByIdForm } from "@/components/friends/add-friend-by-id-form";
import { FriendQrCode } from "@/components/friends/friend-qr-code";
import { QrScanner } from "@/components/friends/qr-scanner";
import { getCurrentProfile } from "@/lib/data/profile";
import { getFriendsList, getPendingRequests, getAllMembers, getFriendshipStatus } from "@/lib/data/friends";

const MEMBERS_PAGE_SIZE = 20;

export default async function FriendsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [friends, requests, membersResult] = await Promise.all([
    getFriendsList(profile.id),
    getPendingRequests(profile.id),
    getAllMembers(profile.id, MEMBERS_PAGE_SIZE, 0),
  ]);

  const initialMembers = await Promise.all(
    membersResult.members.map(async (m) => ({
      ...m,
      friendshipStatus: (await getFriendshipStatus(profile.id, m.id))?.status ?? null,
    })),
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">友達</h1>
      <Tabs defaultValue="members">
        <TabsList className="flex-wrap">
          <TabsTrigger value="members">メンバー一覧</TabsTrigger>
          <TabsTrigger value="list">友達一覧({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">申請一覧({requests.length})</TabsTrigger>
          <TabsTrigger value="search">ユーザー検索</TabsTrigger>
          <TabsTrigger value="add-id">IDで追加</TabsTrigger>
          <TabsTrigger value="qr">QRコード</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <MemberList initialMembers={initialMembers} initialHasMore={membersResult.hasMore} />
        </TabsContent>
        <TabsContent value="list"><FriendList friends={friends} /></TabsContent>
        <TabsContent value="requests"><FriendRequestList requests={requests} /></TabsContent>
        <TabsContent value="search"><FriendSearch /></TabsContent>
        <TabsContent value="add-id"><AddFriendByIdForm /></TabsContent>
        <TabsContent value="qr">
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 font-display font-semibold text-ink">自分のQRコードを見せる</h2>
              <FriendQrCode username={profile.username} />
            </section>
            <section>
              <h2 className="mb-3 font-display font-semibold text-ink">相手のQRコードを読み取る</h2>
              <QrScanner />
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
