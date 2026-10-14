import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { getSettings } from "@/lib/services/listener";
import { SignInPrompt } from "@/components/SignInPrompt";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer.user) return <SignInPrompt title="Settings" body="Sign in to manage playback, notifications and privacy." />;
  const settings = await getSettings(viewer);
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 pt-10 sm:px-6">
      <h1 className="font-serif text-5xl font-semibold">Settings</h1>
      <SettingsForm initial={settings} />
      <section id="subscription" className="card-surface scroll-mt-24 p-6">
        <h2 className="font-serif text-2xl font-semibold">Subscription</h2>
        <p className="mt-2 text-sm text-mist">
          Calm Stories is included in Calm Premium. There are no coins, microtransactions or individual episode purchases.
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-mist">Plan</dt>
            <dd className="mt-1 text-white">{viewer.isPremium ? "Calm Premium" : "Free"}</dd>
          </div>
          <div>
            <dt className="text-mist">Entitlement source</dt>
            <dd className="mt-1 text-white">{viewer.entitlementSource === "mock" ? "Mock (prototype)" : viewer.entitlementSource ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-mist">Roles</dt>
            <dd className="mt-1 text-white">{viewer.roles.length ? viewer.roles.join(", ") : "Listener"}</dd>
          </div>
        </dl>
        <p className="mt-5 text-xs text-mist">
          Simulated: subscriptions are managed by Calm&apos;s existing billing system, which is not connected in this prototype. Switch persona in the account menu to try each tier.
        </p>
      </section>
    </div>
  );
}
