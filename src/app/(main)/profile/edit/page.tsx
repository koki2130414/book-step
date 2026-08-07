import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { getCurrentProfile } from "@/lib/data/profile";

export default async function ProfileEditPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">プロフィール編集</h1>
      <ProfileEditForm profile={profile} />
    </div>
  );
}
