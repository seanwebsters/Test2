import { CoachChat } from "@/components/coach/CoachChat";
import { findMission } from "@/lib/content/paths";
import { storeFor } from "@/lib/server/context";
import { aiConfigured } from "@/lib/server/env";
import { coachUsage } from "@/lib/server/services";
import { requireSession } from "@/lib/server/page";

export const metadata = { title: "Coach" };

export default async function CoachPage({ searchParams }: { searchParams: Promise<{ mission?: string; q?: string }> }) {
  const sp = await searchParams;
  const s = await requireSession();
  const history = await storeFor(s.viewer).listCoachMessages(s.viewer.userId, 60);
  const usage = await coachUsage(s.viewer, s.state.profile);
  const m = sp.mission ? findMission(sp.mission)?.mission : undefined;
  return (
    <CoachChat
      initial={history.map((h) => ({ id: h.id, role: h.role, content: h.content }))}
      remaining={usage.remaining}
      limit={usage.limit}
      plan={s.state.profile.plan}
      aiOnline={aiConfigured()}
      mission={m ? { id: m.id, title: m.title } : null}
      prefill={sp.q?.slice(0, 500) ?? null}
      name={s.state.profile.displayName.split(" ")[0] ?? ""}
    />
  );
}
