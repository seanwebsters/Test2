import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { requireSession } from "@/lib/server/page";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await requireSession({ onboarded: false });
  const p = s.state.profile;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/profile" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-ink-3">
        <ArrowLeft size={16} /> Passport
      </Link>
      <h1 className="h-display mb-5 text-3xl">Settings</h1>
      <SettingsForm displayName={p.displayName} handle={p.handle} minutes={p.onboarding?.minutesPerDay ?? 15} privacy={p.privacy} plan={p.plan} planSource={p.planSource} renewsAt={p.planRenewsAt} isDemo={p.isDemo} email={p.email ?? s.viewer.email} />
    </div>
  );
}
