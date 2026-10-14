"use client";

import { useEffect, useRef, useState } from "react";
import type { AssistantCard, ConceptProposal, ConversationMessage, DirectionProposal, Genre } from "@/lib/types";
import { GENRES } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/util";

function renderInline(text: string) {
  // Minimal markdown: _italic_ and **bold**.
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) =>
    p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith("_") && p.endsWith("_") ? <em key={i} className="text-mist">{p.slice(1, -1)}</em> : <span key={i}>{p}</span>,
  );
}

export function ChatPanel({
  messages,
  sending,
  onSend,
  onCreateFromConcept,
  onResolve,
  onAcceptDirection,
  resolved,
  engine,
}: {
  messages: ConversationMessage[];
  sending: boolean;
  onSend: (text: string) => void;
  onCreateFromConcept: (p: ConceptProposal) => Promise<void>;
  onResolve: (toolCallId: string, action: "confirm" | "cancel") => Promise<void>;
  onAcceptDirection: (p: DirectionProposal, write: boolean) => Promise<void>;
  resolved: Record<string, "confirm" | "cancel">;
  engine: { provider: string; model: string; simulated: boolean } | null;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  const submit = (value: string) => {
    const v = value.trim();
    if (!v || sending) return;
    onSend(v);
    setText("");
  };

  return (
    <section aria-label="Storymaker assistant" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-lavender to-periwinkle text-night">
            <Icon name="sparkle" size={16} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Storymaker</h2>
            <p className="text-[11px] text-mist">Your creative director, writer & producer</p>
          </div>
        </div>
        {engine && (
          <span
            className={cx("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider", engine.simulated ? "bg-amber-300/15 text-amber-200" : "bg-emerald-300/15 text-emerald-200")}
            title={engine.simulated ? "No writing model is configured. Responses come from Calm's deterministic simulator and are labelled as simulated." : `${engine.provider} · ${engine.model}`}
          >
            {engine.simulated ? "Simulated AI" : `${engine.provider} · ${engine.model}`}
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[92%] space-y-3", m.role === "user" && "text-right")}>
              {m.content && (
                <div
                  className={cx(
                    "inline-block whitespace-pre-wrap rounded-3xl px-4 py-3 text-left text-sm leading-relaxed",
                    m.role === "user" ? "rounded-br-lg bg-lavender text-night" : "rounded-bl-lg bg-white/[0.06]",
                  )}
                >
                  {m.role === "assistant" && m.content.startsWith("Every great story") ? <span className="font-serif text-xl">{m.content}</span> : renderInline(m.content)}
                </div>
              )}
              {m.cards?.map((card, i) => (
                <CardView
                  key={i}
                  card={card}
                  onSend={submit}
                  onCreateFromConcept={onCreateFromConcept}
                  onResolve={onResolve}
                  onAcceptDirection={onAcceptDirection}
                  resolved={resolved}
                  disabled={sending}
                />
              ))}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-mist" role="status">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-lavender [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-lavender [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-lavender" />
            </span>
            Working on it…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="border-t border-white/5 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <div className="flex items-end gap-2 rounded-3xl border border-white/10 bg-night/70 p-2 focus-within:border-lavender/50">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(text);
              }
            }}
            rows={2}
            aria-label="Message Storymaker"
            placeholder="Describe an idea, or ask for a change – “Make the narrator warmer and add gentle rain”"
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder:text-mist/60 focus:outline-none"
          />
          <button type="submit" disabled={sending || !text.trim()} aria-label="Send" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-night disabled:opacity-40">
            <Icon name="send" size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}

function CardView({
  card,
  onSend,
  onCreateFromConcept,
  onResolve,
  onAcceptDirection,
  resolved,
  disabled,
}: {
  card: AssistantCard;
  onSend: (t: string) => void;
  onCreateFromConcept: (p: ConceptProposal) => Promise<void>;
  onResolve: (id: string, a: "confirm" | "cancel") => Promise<void>;
  onAcceptDirection: (p: DirectionProposal, write: boolean) => Promise<void>;
  resolved: Record<string, "confirm" | "cancel">;
  disabled: boolean;
}) {
  switch (card.type) {
    case "suggestions":
      return (
        <div className="flex flex-wrap gap-2">
          {card.items.map((s) => (
            <button key={s} disabled={disabled} onClick={() => onSend(s)} className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-white hover:border-lavender/50 hover:bg-lavender/10 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      );
    case "tool_result":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/10 px-2.5 py-1 text-[11px] text-emerald-200">
          <Icon name="check" size={12} /> {card.summary}
        </div>
      );
    case "error":
      return null;
    case "confirmation": {
      const state = resolved[card.tool_call_id];
      return (
        <div className="rounded-3xl border border-amber-200/30 bg-amber-200/5 p-4 text-left text-sm">
          <div className="font-medium">{card.summary}</div>
          <p className="mt-1 text-mist">{card.reason}</p>
          {state ? (
            <p className="mt-3 text-xs text-mist">{state === "confirm" ? "Confirmed." : "Cancelled."}</p>
          ) : (
            <div className="mt-3 flex gap-2">
              <button disabled={disabled} className="btn-primary btn-sm" onClick={() => onResolve(card.tool_call_id, "confirm")}>Go ahead</button>
              <button disabled={disabled} className="btn-ghost btn-sm" onClick={() => onResolve(card.tool_call_id, "cancel")}>Cancel</button>
            </div>
          )}
        </div>
      );
    }
    case "continuity":
      return (
        <div className="rounded-3xl border border-white/10 bg-night-2 p-4 text-left text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Continuity check</span>
            {card.report.simulated && <span className="text-[10px] uppercase tracking-wider text-mist">Rule-based</span>}
          </div>
          <p className="mt-1 text-mist">{card.report.summary}</p>
          {card.report.issues.length > 0 && (
            <ul className="mt-3 space-y-2">
              {card.report.issues.map((i, k) => (
                <li key={k} className={cx("rounded-2xl px-3 py-2 text-xs", i.severity === "conflict" ? "bg-rose-400/10 text-rose-100" : i.severity === "warn" ? "bg-amber-300/10 text-amber-100" : "bg-white/5 text-mist")}>
                  <div className="font-medium">{i.message}</div>
                  {i.evidence && i.evidence !== i.message && <div className="mt-1 italic opacity-80">“{i.evidence.slice(0, 220)}”</div>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-mist">Storymaker never rewrites established lore automatically.</p>
        </div>
      );
    case "direction":
      return <DirectionCard proposal={card.proposal} onAccept={onAcceptDirection} disabled={disabled} onSend={onSend} />;
    case "concept":
      return <ConceptCard proposal={card.proposal} onCreate={onCreateFromConcept} disabled={disabled} />;
  }
}

function DirectionCard({ proposal, onAccept, disabled, onSend }: { proposal: DirectionProposal; onAccept: (p: DirectionProposal, write: boolean) => Promise<void>; disabled: boolean; onSend: (t: string) => void }) {
  const [p, setP] = useState(proposal);
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-3xl border border-lavender/30 bg-lavender/5 p-4 text-left text-sm">
      <div className="text-[11px] uppercase tracking-wider text-lavender">Continue this story</div>
      <input value={p.episode_title} onChange={(e) => setP({ ...p, episode_title: e.target.value })} aria-label="Episode title" className="mt-2 w-full bg-transparent font-serif text-xl focus:outline-none" />
      <textarea value={p.summary} onChange={(e) => setP({ ...p, summary: e.target.value })} aria-label="Episode summary" rows={3} className="input mt-2 text-sm" />
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-mist">
        {p.beats.map((b, i) => <li key={i}>{b}</li>)}
      </ol>
      {done ? (
        <p className="mt-3 text-xs text-mist">Added to your season.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={disabled} className="btn-primary btn-sm" onClick={async () => { await onAccept(p, false); setDone(true); }}>Accept</button>
          <button disabled={disabled} className="btn-accent btn-sm" onClick={async () => { await onAccept(p, true); setDone(true); }}>Accept & write it</button>
          <button disabled={disabled} className="btn-ghost btn-sm" onClick={() => onSend("Suggest a different direction for the next episode")}>Try another</button>
        </div>
      )}
    </div>
  );
}

function ConceptCard({ proposal, onCreate, disabled }: { proposal: ConceptProposal; onCreate: (p: ConceptProposal) => Promise<void>; disabled: boolean }) {
  const [p, setP] = useState(proposal);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  return (
    <div className="overflow-hidden rounded-3xl border border-lavender/30 bg-night-2 text-left text-sm">
      <div className="space-y-3 p-4">
        <div className="text-[11px] uppercase tracking-wider text-lavender">Series concept · editable</div>
        <input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} aria-label="Series title" className="w-full bg-transparent font-serif text-2xl font-semibold focus:outline-none" />
        <input value={p.tagline} onChange={(e) => setP({ ...p, tagline: e.target.value })} aria-label="Tagline" className="w-full bg-transparent font-serif italic text-white/80 focus:outline-none" />
        <textarea value={p.synopsis} onChange={(e) => setP({ ...p, synopsis: e.target.value })} aria-label="Synopsis" rows={5} className="input text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-mist">
            Genre
            <select value={p.genre} onChange={(e) => setP({ ...p, genre: e.target.value as Genre })} className="input mt-1 py-1.5 text-sm">
              {GENRES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <label className="text-xs text-mist">
            Key-art scene
            <select value={p.scene} onChange={(e) => setP({ ...p, scene: e.target.value as ConceptProposal["scene"] })} className="input mt-1 py-1.5 text-sm">
              {["kingdom", "forest", "cabin", "space", "ocean", "garden", "library", "village", "coast", "desert", "aurora", "city", "lake"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div>
          <div className="text-xs text-mist">Overarching narrative</div>
          <textarea value={p.narrative_arc} onChange={(e) => setP({ ...p, narrative_arc: e.target.value })} aria-label="Narrative arc" rows={2} className="input mt-1 text-sm" />
        </div>
        <div>
          <div className="text-xs text-mist">Central characters</div>
          <ul className="mt-1 space-y-2">
            {p.characters.map((c, i) => (
              <li key={i} className="rounded-2xl bg-white/[0.04] p-2.5">
                <div className="flex gap-2">
                  <input value={c.name} aria-label="Character name" onChange={(e) => setP({ ...p, characters: p.characters.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className="w-1/3 bg-transparent font-medium focus:outline-none" />
                  <input value={c.role} aria-label="Character role" onChange={(e) => setP({ ...p, characters: p.characters.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })} className="flex-1 bg-transparent text-xs text-mist focus:outline-none" />
                  <button aria-label={`Remove ${c.name}`} className="text-xs text-mist hover:text-rose-300" onClick={() => setP({ ...p, characters: p.characters.filter((_, j) => j !== i) })}>×</button>
                </div>
                <p className="mt-1 text-xs text-mist">{c.sketch}</p>
              </li>
            ))}
          </ul>
        </div>
        {p.follow_up_questions.length > 0 && (
          <div className="rounded-2xl bg-white/[0.03] p-3 text-xs text-mist">
            <div className="mb-1 font-medium text-white">A couple of questions</div>
            <ul className="list-disc space-y-1 pl-4">{p.follow_up_questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
        )}
        <p className="text-[11px] text-mist">Your original idea is kept in the Story Bible: “{p.original_idea.slice(0, 140)}”</p>
      </div>
      <div className="flex items-center gap-2 border-t border-white/5 bg-white/[0.02] p-3">
        {created ? (
          <span className="text-xs text-mist">Series created.</span>
        ) : (
          <button
            disabled={disabled || creating || !p.title.trim()}
            className="btn-accent btn-sm"
            onClick={async () => {
              setCreating(true);
              try {
                await onCreate(p);
                setCreated(true);
              } finally {
                setCreating(false);
              }
            }}
          >
            {creating ? "Creating…" : "Create this series"}
          </button>
        )}
      </div>
    </div>
  );
}
