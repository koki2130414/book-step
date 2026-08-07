import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FriendSearch } from "@/components/friends/friend-search";
import { FriendRequestList } from "@/components/friends/friend-request-list";
import { FriendList } from "@/components/friends/friend-list";
import { getCurrentProfile } from "@/lib/data/profile";
import { getFriendsList, getPendingRequests } from "@/lib/data/friends";

export default async function FriendsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [friends, requests] = await Promise.all([getFriendsList(profile.id), getPendingRequests(profile.id)]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">友達</h1>
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">友達一覧({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">申請一覧({requests.length})</TabsTrigger>
          <TabsTrigger value="search">ユーザー検索</TabsTrigger>
        </TabsList>
        <TabsContent value="list"><FriendList friends={friends} /></TabsContent>
        <TabsContent value="requests"><FriendRequestList requests={requests} /></TabsContent>
        <TabsContent value="search"><FriendSearch /></TabsContent>
      </Tabs>
    </div>
  );
}
