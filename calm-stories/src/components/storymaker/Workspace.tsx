"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WorkspaceSnapshot } from "@/lib/storymaker/service";
import type { AiConversation } from "@/lib/types";
import { cx } from "@/lib/util";
import { ChatPanel } from "./ChatPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { Navigator } from "./Navigator";
import { Preview } from "./Preview";
import { WorkspaceProvider, useWorkspace, type WriterBadge } from "./WorkspaceContext";

export interface SeriesOption {
  id: string;
  title: string;
  status: string;
}

export function Workspace(props: {
  snapshot: WorkspaceSnapshot | null;
  conversation: AiConversation | null;
  writer: WriterBadge;
  mySeries: SeriesOption[];
}) {
  return (
    <WorkspaceProvider initialSnapshot={props.snapshot} initialConversation={props.conversation} writer={props.writer} key={props.snapshot?.series.id ?? "new"}>
      <Shell mySeries={props.mySeries} />
    </WorkspaceProvider>
  );
}

type MobileTab = "story" | "chat" | "preview";

function Shell({ mySeries }: { mySeries: SeriesOption[] }) {
  const { snapshot, writer, toast, notify, busy, section } = useWorkspace();
  const [tab, setTab] = useState<MobileTab>("chat");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => notify(null), 6000);
    return () => clearTimeout(t);
  }, [toast, notify]);
  // On small screens, picking a section shows its preview.
  useEffect(() => setTab((t) => (t === "story" ? "preview" : t)), [section]);

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[560px] flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-2.5 sm:px-6">
        <h1 className="font-serif text-xl font-semibold">Storymaker</h1>
        <label className="sr-only" htmlFor="series-picker">Open series</label>
        <select
          id="series-picker"
          value={snapshot?.series.id ?? ""}
          onChange={(e) => {
            window.location.href = e.target.value ? `/create?series=${encodeURIComponent(e.target.value)}` : "/create?new=1";
          }}
          className="max-w-[16rem] truncate rounded-full border border-white/10 bg-night-2 px-3 py-1.5 text-sm"
        >
          <option value="">+ New story</option>
          {mySeries.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
              {s.status !== "published" ? ` (${s.status.replace("_", " ")})` : ""}
            </option>
          ))}
        </select>
        <span
          className={cx("rounded-full px-2.5 py-1 text-xs", writer.simulated ? "bg-amber-300/15 text-amber-200" : "bg-emerald-300/10 text-emerald-200")}
          title={writer.simulated ? "No AI provider key is configured, so a deterministic offline writer is used. See docs/INTEGRATIONS.md." : `Writing with ${writer.provider}`}
        >
          {writer.simulated ? "Simulated writer" : `${writer.provider} · ${writer.model}`}
        </span>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {busy && (
            <span className="flex items-center gap-2 text-mist" role="status">
              <span className="h-2 w-2 animate-pulse rounded-full bg-lavender" aria-hidden /> {busy}
            </span>
          )}
          <Link href="/studio" className="text-mist hover:text-white">
            Creator studio
          </Link>
        </div>
      </header>

      <nav className="flex border-b border-white/10 lg:hidden" aria-label="Workspace panels">
        {(["story", "chat", "preview"] as MobileTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={cx("flex-1 py-2.5 text-sm capitalize", tab === t ? "border-b-2 border-lavender text-white" : "text-mist")}>
            {t}
          </button>
        ))}
      </nav>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1.15fr)]">
        <aside className={cx("min-h-0 overflow-y-auto border-white/10 lg:block lg:border-r", tab === "story" ? "block" : "hidden")} aria-label="Story navigator">
          <Navigator />
        </aside>
        <section className={cx("min-h-0 flex-col border-white/10 lg:flex lg:border-r", tab === "chat" ? "flex" : "hidden")} aria-label="Assistant">
          <ChatPanel />
        </section>
        <section className={cx("min-h-0 overflow-y-auto lg:block", tab === "preview" ? "block" : "hidden")} aria-label="Live preview">
          <Preview />
        </section>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-40 max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-night-3 px-4 py-3 text-sm shadow-card">
          {toast}
          <button onClick={() => notify(null)} className="ml-3 text-mist hover:text-white" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
