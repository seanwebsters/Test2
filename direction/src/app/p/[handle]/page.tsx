import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { PassportView } from "@/components/passport/PassportView";
import { dayKey } from "@/lib/engine/dates";
import { publicPassports } from "@/lib/server/context";

export const dynamic = "force-dynamic";

async function load(handle: string) {
  if (!/^[a-z0-9_]{3,40}$/i.test(handle)) return null;
  return publicPassports().findPublicProfile(handle);
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const d = await load(handle);
  return d ? { title: `${d.profile.displayName}'s Passport`, robots: { index: false } } : { title: "Passport not found", robots: { index: false } };
}

export default async function PublicPassport({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const d = await load(handle);
  if (!d) notFound();
  const state = { ...d, bookmarks: [], careerViews: [], coachMessageCount: 0, coachConversations: 0 };
  return (
    <div className="min-h-dvh px-4 py-6">
      <header className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/onboarding" className="btn-primary btn-sm">
          Find your direction
        </Link>
      </header>
      <PassportView state={state} today={dayKey(new Date(), d.profile.timezone)} mode="public" show={d.profile.privacy} />
      <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-ink-3">Shared from DIRECTION. The owner chooses what appears here.</p>
    </div>
  );
}
