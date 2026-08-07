import { NotificationList } from "@/components/notifications/notification-list";
import { getCurrentProfile } from "@/lib/data/profile";
import { getNotifications } from "@/lib/data/notifications";

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const notifications = await getNotifications(profile.id);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">通知</h1>
      <NotificationList notifications={notifications} userId={profile.id} />
    </div>
  );
}
