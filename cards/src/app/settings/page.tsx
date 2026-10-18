import Link from "next/link";
import { container, eyebrow } from "@/components/ui/styles";
import { pageCtx } from "@/lib/view/page";
import { SettingsForms } from "./SettingsForms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user } = await pageCtx();
  return (
    <div className={`${container} max-w-3xl pt-10`}>
      <p className={eyebrow}>Settings</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-bone-3">Change your interests any time in <Link className="underline" href="/welcome?step=genres">onboarding</Link>.</p>
      <div className="mt-8">
        <SettingsForms profile={{ displayName: user.displayName, username: user.username, bio: user.bio, avatarSeed: user.avatarSeed }} settings={user.settings} isGuest={user.isGuest} role={user.role} />
      </div>
    </div>
  );
}
