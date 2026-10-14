"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon, SparkleIcon } from "@/components/icons";
import type { ConversationMessage } from "@/lib/types";
import { cx } from "@/lib/util";
import { CardView } from "./Cards";
import { useWorkspace } from "./WorkspaceContext";

export const WELCOME = "Every great story starts somewhere. What would you like to create?";
const STARTERS = [
  "Create a Sleep Story romantasy set in a moonlit kingdom",
  "Build a cosy mystery series in a seaside village",
  "Write a calming sci-fi story aboard a slow-moving space station",
  "Create a fantasy world inspired by Scandinavian forests",
  "Write an episode about a lighthouse keeper during a winter storm",
  "Create a recurring character who runs a magical bakery",
];

export function ChatPanel() {
  const { conversation, send, busy, snapshot, writer } = useWorkspace();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const messages = conversation?.messages ?? [];
  const lastSuggestions = [...messages].reverse().find((m) => m.role === "assistant")?.cards?.find((c) => c.type === "suggestions");

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages.length, busy]);

  async function submit(message: string) {
    const m = message.trim();
    if (!m || busy) return;
    setText("");
    await send(m);
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg pt-6 text-center">
            <SparkleIcon className="mx-auto h-8 w-8 text-lavender" />
            <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight">{snapshot ? `Let's keep working on ${snapshot.series.title}.` : WELCOME}</h2>
            <p className="mt-3 text-sm text-mist">
              {snapshot ? "Ask for a World Bible, new characters, a season plan or the next episode." : "Share an idea, a place, a feeling or a character. I'll shape it into a series you can edit."}
            </p>
            {!snapshot && (
              <ul className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <li key={s}>
                    <button onClick={() => submit(s)} className="h-full w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-mist transition-colors hover:border-lavender/50 hover:text-white">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <ol className="mx-auto max-w-2xl space-y-5">
          {messages.map((m) => (
            <Message key={m.id} m={m} />
          ))}
        </ol>
        {busy && (
          <p className="mx-auto mt-4 max-w-2xl text-sm text-mist" role="status">
            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-lavender" aria-hidden />
            {busy}
          </p>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-white/10 px-4 py-3 sm:px-6">
        {lastSuggestions?.type === "suggestions" && !busy && (
          <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
            {lastSuggestions.items.map((s) => (
              <button key={s} onClick={() => submit(s)} className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist hover:border-lavender/50 hover:text-white">
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(text);
          }}
          className="flex items-end gap-2"
        >
          <label htmlFor="storymaker-input" className="sr-only">
            Message Storymaker
          </label>
          <textarea
            id="storymaker-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(text);
              }
            }}
            rows={2}
            maxLength={8000}
            placeholder={snapshot ? "Ask for changes, a new episode, or what happens next…" : "Describe your story idea…"}
            className="min-h-[3rem] flex-1 resize-none rounded-2xl border border-white/10 bg-night-2 px-4 py-3 text-sm placeholder:text-mist/60 focus:border-lavender/60 focus:outline-none"
          />
          <button type="submit" disabled={!text.trim() || !!busy} className="grid h-11 w-11 place-items-center rounded-full bg-lavender text-night disabled:opacity-40" aria-label="Send">
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
        {writer.simulated && <p className="mt-2 text-[11px] text-mist/70">Simulated assistant: no AI provider is configured, so replies come from a deterministic offline writer.</p>}
      </div>
    </>
  );
}

function Message({ m }: { m: ConversationMessage }) {
  const cards = (m.cards ?? []).filter((c) => c.type !== "suggestions");
  if (m.role === "user") {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-lavender/20 px-4 py-2.5 text-sm">{m.content}</p>
      </li>
    );
  }
  if (!m.content && !cards.length) return null;
  return (
    <li className="space-y-3">
      {m.content && (
        <div className="flex gap-3">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lavender/20 text-lavender" aria-hidden>
            <SparkleIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className={cx("whitespace-pre-wrap text-sm leading-relaxed")}>{m.content}</p>
            {m.simulated && <span className="mt-1 inline-block text-[10px] uppercase tracking-wider text-amber-200/70">Simulated assistant</span>}
          </div>
        </div>
      )}
      {cards.map((c, i) => (
        <div key={i} className="sm:ml-10">
          <CardView card={c} />
        </div>
      ))}
    </li>
  );
}
