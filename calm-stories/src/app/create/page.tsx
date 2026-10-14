import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth/session";
import { canCreate, isAdmin } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { StorymakerApp } from "@/components/storymaker/StorymakerApp";

export const metadata = { title: "Calm Storymaker" };

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ series?: string }> }) {
  const { series: requested } = await searchParams;
  const viewer = await getViewer();
  if (!viewer.user || !canCreate(viewer)) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-32 text-center sm:px-8">
        <p className="chip mb-4">Calm Storymaker</p>
        <h1 className="headline text-5xl">Every great story starts somewhere.</h1>
        <p className="mt-4 text-mist">
          Storymaker is an AI creative partner that helps you build worlds, characters and complete Sleep Story series – then produce, narrate and submit them to Calm. It&rsquo;s available to creator accounts.
        </p>
        <Link href="/sign-in?next=/create" className="btn-accent mt-8">
          {viewer.user ? "Switch to a creator account" : "Sign in as a creator"}
        </Link>
      </div>
    );
  }
  const db = getDb();
  const all = isAdmin(viewer) ? await db.list("series") : await db.list("series", { where: { creator_id: viewer.user.id } });
  const mine = all
    .filter((s) => isAdmin(viewer) ? s.creator_id === viewer.user!.id || s.is_official : true)
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .map((s) => ({ id: s.id, title: s.title, status: s.status }));
  const initial = requested && all.some((s) => s.id === requested) ? requested : null;
  return (
    <Suspense>
      <StorymakerApp initialSeriesId={initial} series={mine} />
    </Suspense>
  );
}
