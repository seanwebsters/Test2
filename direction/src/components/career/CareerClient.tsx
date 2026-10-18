"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useCelebrate } from "@/components/app/Celebrate";

interface Insight {
  source: "ai" | "editorial";
  note: string;
  realityCheck: string;
  typicalWeek: string[];
  misconceptions: string[];
  questionsToAsk: string[];
  firstSteps: string[];
}

/** Records the view (for the Explorer badge) once per page load. */
export function RecordView({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const { celebrate } = useCelebrate();
  useEffect(() => {
    if (!signedIn) return;
    fetch(`/api/careers/${slug}/view`, { method: "POST" })
      .then((r) => r.json())
      .then((d: { newAchievements?: { id: string; name: string; emoji: string; xp: number }[] }) => {
        if (d.newAchievements?.length) celebrate({ kind: "achievement", title: "Badge unlocked!", subtitle: "Curiosity pays off.", achievements: d.newAchievements });
      })
      .catch(() => {});
  }, [slug, signedIn, celebrate]);
  return null;
}

export function DeeperLook({ slug, title }: { slug: string; title: string }) {
  const [data, setData] = useState<Insight | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const load = async () => {
    setState("loading");
    try {
      const r = await fetch(`/api/careers/${slug}/insight`);
      if (!r.ok) throw new Error();
      setData((await r.json()) as Insight);
      setState("idle");
    } catch {
      setState("error");
    }
  };
  if (!data) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <Sparkles size={18} className="text-lavender" /> Get the real picture
        </div>
        <p className="mt-1 text-sm text-ink-2">Pip can put together a reality check on being a {title}: a typical week, common myths and questions worth asking.</p>
        <button className="btn-ghost btn-sm mt-3" onClick={load} disabled={state === "loading"}>
          {state === "loading" ? "Thinking…" : state === "error" ? "Try again" : "Show me"}
        </button>
      </div>
    );
  }
  const List = ({ title: t, items }: { title: string; items: string[] }) =>
    items.length ? (
      <div>
        <h4 className="eyebrow mb-1.5">{t}</h4>
        <ul className="space-y-1 text-sm text-ink-2">
          {items.map((x, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-teal">•</span> {x}
            </li>
          ))}
        </ul>
      </div>
    ) : null;
  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center gap-2 font-display text-lg font-bold">
        <Sparkles size={18} className="text-lavender" /> The real picture
      </div>
      <p className="text-ink-2">{data.realityCheck}</p>
      <List title="A typical week" items={data.typicalWeek} />
      <List title="Myths vs reality" items={data.misconceptions} />
      <List title="Questions to ask someone in the job" items={data.questionsToAsk} />
      <List title="First steps this month" items={data.firstSteps} />
      <p className="text-xs text-ink-3">{data.note}</p>
    </div>
  );
}
