import { getDb } from "@/lib/db";
import { AgentsConsole } from "@/components/admin/AgentsConsole";

export const metadata = { title: "Agents & jobs" };

export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  const db = getDb();
  const [agents, jobs, series, workflows, voices, soundscapes, episodes] = await Promise.all([
    db.list("agent_configurations"),
    db.list("ai_production_jobs", { orderBy: { column: "created_at", ascending: false }, limit: 40 }),
    db.list("series"),
    db.list("production_workflows"),
    db.list("voice_profiles"),
    db.list("soundscapes"),
    db.list("episodes"),
  ]);
  const order = ["showrunner", "writer", "continuity", "sleep_editor", "voice_director", "audio_producer", "publishing"];
  const epTitle = Object.fromEntries(episodes.map((e) => [e.id, e.title]));
  return (
    <AgentsConsole
      initialJobId={job ?? null}
      agents={agents.sort((a, b) => order.indexOf(a.agent) - order.indexOf(b.agent))}
      jobs={jobs.map((j) => ({ ...j, episode_title: j.episode_id ? (epTitle[j.episode_id] ?? null) : null }))}
      series={series
        .filter((s) => s.status !== "removed")
        .sort((a, b) => Number(b.is_official) - Number(a.is_official) || a.title.localeCompare(b.title))
        .map((s) => ({ id: s.id, title: s.title, official: s.is_official, narrator_voice_id: s.narrator_voice_id, soundscape_id: s.soundscape_id }))}
      workflows={workflows}
      voices={voices.filter((v) => v.approved).map((v) => ({ id: v.id, name: v.name }))}
      soundscapes={soundscapes.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
