import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { createRun } from "@/lib/studio/engine";
import "@/lib/studio";

/** Ask the Program Director for new series proposals based on audience data. */
export const POST = route(async () => {
  const viewer = await requireEditor();
  const { run } = await createRun({
    kind: "series_development",
    title: "Program Director proposals",
    budget_cents: 100,
    created_by: viewer.user.id,
    steps: [{ key: "proposals", type: "program.proposals", agent: "program_director", label: "Propose new series from audience data", activity: "thinking", deps: [] }],
  });
  return { run_id: run.id };
});
