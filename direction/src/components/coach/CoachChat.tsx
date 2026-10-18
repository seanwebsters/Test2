"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Lock, RotateCcw, Sparkles, X } from "lucide-react";
import { Pip } from "@/components/brand/Pip";
import { useCelebrate } from "@/components/app/Celebrate";
import { cn } from "@/lib/cn";
import { Markdown } from "./Markdown";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MODES = [
  { id: "chat", label: "Chat", plus: false },
  { id: "interview", label: "Interview practice", plus: true },
  { id: "cv", label: "CV review", plus: false },
  { id: "outreach", label: "Outreach message", plus: false },
  { id: "plan", label: "Development plan", plus: false },
  { id: "portfolio", label: "Portfolio feedback", plus: true },
  { id: "change", label: "Change direction", plus: false },
] as const;

const STARTERS: Record<string, string[]> = {
  chat: ["What should I focus on this week?", "Explain what a typical week looks like in my direction", "I'm feeling stuck — help me get going"],
  interview: ["Let's practise for a junior role", "Ask me the hardest question you've got"],
  cv: ["How should I structure my first CV?", "Here's my CV — what would you change?"],
  outreach: ["Help me message someone whose work I admire", "Write a LinkedIn note to an alumni"],
  plan: ["Make me a 4-week plan", "I have exams soon — adjust my plan"],
  portfolio: ["Review my latest project", "What should my next portfolio piece be?"],
  change: ["I'm not sure my path is right for me", "What else could I do with my skills?"],
};

export function CoachChat({ initial, remaining, limit, plan, aiOnline, mission, prefill, name }: { initial: Msg[]; remaining: number; limit: number; plan: "free" | "plus"; aiOnline: boolean; mission: { id: string; title: string } | null; prefill: string | null; name: string }) {
  const { toast } = useCelebrate();
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [input, setInput] = useState(prefill ?? (mission ? `Can you help me with "${mission.title}"?` : ""));
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("chat");
  const [missionCtx, setMissionCtx] = useState(mission);
  const [left, setLeft] = useState(remaining);
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || streaming) return;
    const m = MODES.find((x) => x.id === mode)!;
    if (m.plus && plan !== "plus") {
      toast("That mode is part of Direction Plus.", "error");
      return;
    }
    setInput("");
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: message };
    const botId = `a-${Date.now()}`;
    setMsgs((x) => [...x, userMsg, { id: botId, role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mode, missionId: missionCtx?.id ?? null }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Pip couldn't reply just now.");
      }
      setLeft((n) => Math.max(0, n - 1));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs((x) => x.map((mm) => (mm.id === botId ? { ...mm, content: acc } : mm)));
      }
    } catch (e) {
      setMsgs((x) => x.filter((mm) => mm.id !== botId));
      toast((e as Error).message, "error");
      setInput(message);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const clear = async () => {
    if (!confirm("Clear your conversation history with Pip?")) return;
    await fetch("/api/coach", { method: "DELETE" });
    setMsgs([]);
  };

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] flex-col lg:h-[calc(100dvh-6rem)]">
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <Pip mood={streaming ? "thinking" : "happy"} size={48} />
          <div>
            <h1 className="h-display text-xl leading-none">Pip, your coach</h1>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-ink-3">
              <span className={cn("h-2 w-2 rounded-full", aiOnline ? "bg-teal" : "bg-sun")} />
              {aiOnline ? "Online" : "Offline mode — guided answers"} · {left}/{limit} messages left today
            </div>
          </div>
        </div>
        {msgs.length > 0 && (
          <button onClick={clear} className="focus-ring rounded-full p-2 text-ink-3 hover:bg-surface-2" aria-label="Clear conversation">
            <RotateCcw size={18} />
          </button>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar" role="radiogroup" aria-label="Coaching mode">
        {MODES.map((m) => (
          <button key={m.id} role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} className={cn("chip shrink-0 !py-1.5 !text-xs", mode === m.id && "!border-teal !bg-teal !text-white")}>
            {m.plus && plan !== "plus" && <Lock size={12} />} {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto rounded-4xl bg-surface-2/60 p-3 md:p-5" aria-live="polite">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center px-4 py-8 text-center">
            <Pip mood="wave" size={110} />
            <p className="h-display mt-3 text-xl">Hey {name}! What&apos;s on your mind?</p>
            <p className="mt-1 max-w-sm text-sm text-ink-2">I know your goals, path and progress. Ask me anything about careers, missions, CVs, interviews or big decisions.</p>
          </div>
        )}
        <div className="space-y-3">
          {msgs.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed", m.role === "user" ? "rounded-br-md bg-teal text-white" : "rounded-bl-md bg-surface shadow-card")}>
                {m.role === "assistant" ? (m.content ? <Markdown text={m.content} /> : <TypingDots />) : <span className="whitespace-pre-wrap">{m.content}</span>}
              </div>
            </div>
          ))}
        </div>
        <div ref={endRef} />
      </div>

      {MODES.find((m) => m.id === mode)?.plus && plan !== "plus" ? (
        <Link href="/plus" className="mt-3 flex items-center gap-3 rounded-3xl bg-lavender-soft p-4 text-sm font-semibold">
          <Sparkles className="shrink-0 text-lavender" /> Structured {mode === "interview" ? "interview practice with scoring" : "portfolio feedback"} is part of Direction Plus. See plans →
        </Link>
      ) : (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-3 no-scrollbar">
            {(STARTERS[mode] ?? []).map((s) => (
              <button key={s} onClick={() => send(s)} disabled={streaming || left <= 0} className="chip shrink-0 !text-xs">
                {s}
              </button>
            ))}
          </div>
          {missionCtx && (
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-sun-soft px-3 py-2 text-xs font-semibold">
              Helping with: {missionCtx.title}
              <button onClick={() => setMissionCtx(null)} className="ml-auto" aria-label="Remove mission context">
                <X size={14} />
              </button>
            </div>
          )}
          <form
            className="mt-2 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={left > 0 ? "Message Pip…" : "You've used today's messages"}
              disabled={left <= 0}
              className="input max-h-40 min-h-[52px] flex-1 resize-none"
              aria-label="Message Pip"
              maxLength={6000}
            />
            <button className="btn-primary h-[52px] w-[52px] !p-0" disabled={!input.trim() || streaming || left <= 0} aria-label="Send">
              <ArrowUp size={22} />
            </button>
          </form>
          {left <= 0 && plan === "free" && (
            <Link href="/plus" className="mt-2 text-center text-xs font-bold text-lavender">
              Unlimited coaching with Plus →
            </Link>
          )}
        </>
      )}
      <p className="mt-2 text-center text-[11px] text-ink-3">Pip gives guidance, not guarantees. Check important details with official sources.</p>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Pip is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
