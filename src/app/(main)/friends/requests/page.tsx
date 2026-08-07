import { redirect } from "next/navigation";

// 通知からの導線用に個別URLを維持しつつ、実体は /friends の申請タブに集約
export default function FriendRequestsRedirect() {
  redirect("/friends?tab=requests");
}
