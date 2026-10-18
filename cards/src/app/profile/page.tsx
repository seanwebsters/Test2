import Link from "next/link";
import { ProfileView } from "@/components/social/ProfileView";
import { btn } from "@/components/ui/styles";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Profile" };

export default async function MyProfile() {
  const { state, user, at } = await pageCtx();
  return (
    <>
      {user.isGuest && (
        <div className="mx-auto mt-6 max-w-[1500px] px-4 md:px-8">
          <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-ember/30 bg-ember/10 p-4 sm:flex-row sm:items-center">
            <p className="text-sm"><b>You're collecting as a guest.</b> Create a free account to keep your cards on any device and get a public profile.</p>
            <Link href="/settings#account" className={btn("primary", "sm")}>Create account</Link>
          </div>
        </div>
      )}
      <ProfileView
        state={state}
        user={user}
        at={at}
        actions={
          <div className="flex gap-2">
            <Link href="/collection?view=showcase" className={btn("glass", "sm")}>Edit showcase</Link>
            <Link href="/settings" className={btn("glass", "sm")}>Edit profile</Link>
            {user.role === "admin" && <Link href="/studio" className={btn("light", "sm")}>Open Studio</Link>}
          </div>
        }
      />
    </>
  );
}
