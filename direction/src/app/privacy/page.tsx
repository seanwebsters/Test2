import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="h-display mt-8 text-4xl">Your data, your call</h1>
      <div className="mt-6 space-y-5 text-ink-2">
        <p><strong className="text-ink">What we store.</strong> Your onboarding answers, chosen paths, completed missions and anything you write as evidence, coach conversations, saved opportunities and Passport entries. We use them only to personalise Direction for you.</p>
        <p><strong className="text-ink">Private by default.</strong> Your Passport is private until you switch it on, and you choose exactly which sections are visible. Entries you mark private never appear publicly.</p>
        <p><strong className="text-ink">We never sell your data.</strong> We don&apos;t sell or share personal or career data with employers, recruiters or advertisers. Any future partnership features will be opt-in, with explicit consent.</p>
        <p><strong className="text-ink">AI coaching.</strong> When the AI coach is enabled, your message and a summary of your profile are sent to our AI provider to generate a reply. API keys stay on our servers. The coach gives guidance, not guarantees.</p>
        <p><strong className="text-ink">Your controls.</strong> Download everything we hold or permanently delete your account any time from Settings.</p>
        <p><strong className="text-ink">Security.</strong> Private data is protected by row-level security in our database, sessions use secure HTTP-only cookies, and access is limited to you.</p>
        <p className="text-sm">Questions? Contact the team running this deployment.</p>
      </div>
    </div>
  );
}
