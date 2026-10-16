import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { isEditor } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { SceneArt } from "@/components/art/SceneArt";
import { StudioNav } from "@/components/studio/StudioNav";
import "@/lib/studio";

export const metadata = { title: { default: "Sleep Stories Studio", template: "%s · Sleep Stories Studio" } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer.user || !isEditor(viewer)) {
    return (
      <div className="mx-auto max-w-xl px-6 pt-40 text-center">
        <h1 className="headline text-5xl">Sleep Stories Studio</h1>
        <p className="mt-4 text-mist">The production house is for Calm&rsquo;s creative team.</p>
        <Link href="/sign-in?next=/studio" className="btn-primary mt-6">Sign in</Link>
      </div>
    );
  }
  const db = getDb();
  const [projects, reviews, blockedRuns, runs] = await Promise.all([
    db.list("series_projects", { where: { status: "awaiting_greenlight" } }),
    db.list("editorial_reviews", { where: { status: "pending" } }),
    db.list("workflow_runs", { where: { status: "blocked" } }),
    db.list("workflow_runs", { where: { kind: "episode_production", status: ["running", "awaiting_approval", "blocked"] }, orderBy: { column: "updated_at", ascending: false }, limit: 1 }),
  ]);
  const current = runs[0];
  const series = current?.series_id ? await db.get("series", current.series_id) : null;
  const steps = current ? await db.list("workflow_steps", { where: { run_id: current.id } }) : [];
  const progress = steps.length ? Math.round((steps.filter((s) => s.status === "succeeded" || s.status === "skipped").length / steps.length) * 100) : 0;
  return (
    <div className="studio flex min-h-screen bg-[radial-gradient(ellipse_at_top_left,#1b1f4a_0%,#0b1128_45%,#070b1c_100%)]">
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-white/5 bg-[#0b1029]/80 px-4 py-6 backdrop-blur lg:flex">
        <Link href="/studio" className="mb-8 flex items-center gap-3 px-2">
          <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden>
            <defs>
              <linearGradient id="moonmark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f3eaff" />
                <stop offset="1" stopColor="#a99bf4" />
              </linearGradient>
            </defs>
            <path d="M26 4a16 16 0 1 0 10 25A13 13 0 0 1 26 4Z" fill="url(#moonmark)" />
          </svg>
          <span>
            <span className="block font-serif text-[22px] leading-none text-white">Sleep Stories</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-mist">Studio</span>
          </span>
        </Link>
        <StudioNav approvals={projects.length + reviews.length + blockedRuns.length} />
        <Link href="/studio/series/new" className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-lavender/40 py-2.5 font-serif text-[16px] text-white hover:bg-lavender/10">
          <span className="text-lg leading-none">+</span> New Series
        </Link>
        <div className="mt-auto">
          {current && series ? (
            <Link href={`/studio/pipeline?run=${current.id}`} className="block overflow-hidden rounded-2xl border border-white/10">
              <div className="relative h-28">
                <SceneArt spec={series.artwork} className="h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1029] via-transparent" />
              </div>
              <div className="px-3 pb-3">
                <div className="font-serif text-lg leading-tight text-white">{series.title}</div>
                <div className="text-xs text-mist">{current.title.split("·").pop()?.trim()} · {current.status.replace("_", " ")}</div>
                <div className="mt-2 h-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-lavender" style={{ width: `${progress}%` }} /></div>
              </div>
            </Link>
          ) : (
            <p className="px-2 text-xs text-mist">Nothing in production. Start a new series or commission an episode.</p>
          )}
          <Link href="/" className="mt-4 block px-2 text-xs text-mist hover:text-white">← Listener app</Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3 lg:hidden">
          <Link href="/studio" className="font-serif text-xl">Sleep Stories Studio</Link>
          <Link href="/studio/approvals" className="ml-auto text-sm text-lavender">Approvals</Link>
          <Link href="/studio/team" className="text-sm text-mist">Team</Link>
        </div>
        <div className="px-4 py-6 sm:px-8 lg:px-10">{children}</div>
      </div>
    </div>
  );
}
