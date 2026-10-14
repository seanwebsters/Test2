import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { tierOf } from "@/lib/auth/policy";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer.user) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-32 sm:px-8">
        <h1 className="headline text-5xl">Settings</h1>
        <p className="mt-4 text-mist">Sign in to manage your listening preferences.</p>
        <Link href="/sign-in?next=/settings" className="btn-primary mt-6">Sign in</Link>
      </div>
    );
  }
  const settings = await getDb().get("user_settings", viewer.user.id);
  const ent = await getDb().findOne("subscription_entitlements", { user_id: viewer.user.id });
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-32 sm:px-8">
      <h1 className="headline text-5xl">Settings</h1>
      <section className="card mt-8 p-6">
        <h2 className="headline text-2xl">Membership</h2>
        <p className="mt-2 text-sm text-mist">
          Plan: <strong className="text-white">{viewer.plan === "premium" ? "Calm Premium" : "Free"}</strong> · Access level: {tierOf(viewer)}
          {ent?.source === "mock" && <> · <span className="text-amber-200">mock entitlement (prototype)</span></>}
        </p>
        <p className="mt-2 text-xs text-mist">Calm Stories is included with Calm Premium and is managed through your Calm subscription. There are no in-app purchases.</p>
      </section>
      <SettingsForm
        initial={{
          autoplay_next: settings?.autoplay_next ?? true,
          autoplay_limit: settings?.autoplay_limit ?? 3,
          default_speed: settings?.default_speed ?? 1,
          default_sleep_timer_minutes: settings?.default_sleep_timer_minutes ?? null,
          new_episode_updates: settings?.new_episode_updates ?? true,
          private_listening_history: settings?.private_listening_history ?? false,
        }}
      />
    </div>
  );
}
