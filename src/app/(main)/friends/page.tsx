import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FriendManageList } from "@/components/friends/friend-manage-list";
import { getCurrentProfile } from "@/lib/data/profile";
import { getFriendsList, getHiddenProfiles } from "@/lib/data/friends";

export default async function FriendsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [friends, hidden] = await Promise.all([getFriendsList(profile.id), getHiddenProfiles(profile.id)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">友達</h1>
        <p className="text-sm text-ink/50">BOOK STEPに登録している人は全員が友達です。見たくない人は非表示にできます。</p>
      </div>
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">友達一覧({friends.length})</TabsTrigger>
          <TabsTrigger value="hidden">非表示({hidden.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <FriendManageList users={friends} mode="friends" />
        </TabsContent>
        <TabsContent value="hidden">
          <FriendManageList users={hidden} mode="hidden" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
