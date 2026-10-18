import { getStore } from "@/lib/db";
import { STEPS } from "@/lib/studio/engine";
import { aiProvider } from "@/lib/studio/providers";
import { GenerateWizard } from "./GenerateWizard";

export const metadata = { title: "AI Studio" };

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job: jobId } = await searchParams;
  const state = getStore().read();
  const job = jobId ? state.jobs.find((j) => j.id === jobId) : undefined;
  const ai = aiProvider();
  const universe = job?.universeId ? state.universes.find((u) => u.id === job.universeId) : undefined;
  return (
    <GenerateWizard
      key={job?.id ?? "new"}
      initialJob={job ?? null}
      steps={STEPS.map((s) => ({ key: s.key, agent: s.agent, title: s.title, description: s.description, needs: s.needs, ruleBased: !!s.ruleBased }))}
      ai={ai ? { label: ai.label, model: ai.model ?? "" } : null}
      universe={universe ? { id: universe.id, slug: universe.slug, status: universe.status } : null}
      recent={[...state.jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8).map((j) => ({ id: j.id, brief: j.brief, status: j.status }))}
    />
  );
}
