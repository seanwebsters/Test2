"use client";

import { useState } from "react";

const EXAMPLES = ["Why does it say the disk is full?", "Why isn't anything being narrated?", "What should I do next?"];

/** Ask the studio a question in plain English; answered from its live state. */
export function AskStudio() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ask = async (question: string) => {
    if (!question.trim()) return;
    setBusy(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/studio/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const data = (await res.json().catch(() => ({}))) as { answer?: string; error?: string };
      setAnswer(data.answer ?? data.error ?? "Couldn't get an answer.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-3xl border border-lavender/30 bg-lavender/[0.05] p-4">
      <h2 className="font-serif text-2xl text-white">Ask the studio</h2>
      <p className="text-xs text-mist">Ask anything in plain English – answers use the studio&rsquo;s live state (disk, errors, budgets, settings).</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <input className="input flex-1 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Why does it keep getting blocked?" aria-label="Your question" />
        <button className="btn-primary btn-sm" disabled={busy}>{busy ? "Thinking…" : "Ask"}</button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((x) => (
          <button key={x} type="button" className="rounded-full border border-white/15 px-3 py-1 text-xs text-mist hover:text-white" onClick={() => { setQ(x); void ask(x); }}>{x}</button>
        ))}
      </div>
      {answer && <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-white/[0.04] p-3 text-sm text-white/90" role="status">{answer}</div>}
    </section>
  );
}
