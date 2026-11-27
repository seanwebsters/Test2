"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import Mascot from "@/components/Mascot";
import { Button, Chip, Sheet } from "@/components/ui";
import { IconExternal } from "@/components/icons";
import { getLesson } from "@/content/curriculum";
import { CATEGORIES, TOOLS, recommendedTools, type Tool, type ToolCategory } from "@/content/tools";
import { useStore } from "@/lib/store";

const LEVEL_STYLE = {
  beginner: "bg-mint-100 text-mint-600",
  intermediate: "bg-sun-100 text-[#9A6A00]",
  advanced: "bg-coral-100 text-coral-600",
};

export default function DiscoverPage() {
  const profile = useStore((s) => s.profile);
  const [cat, setCat] = useState<ToolCategory | "all">("all");
  const [level, setLevel] = useState<"all" | Tool["level"]>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Tool | null>(null);
  const recs = useMemo(() => (profile ? recommendedTools(profile.interests, profile.work, profile.familiarity) : []), [profile]);

  const list = TOOLS.filter(
    (t) =>
      (cat === "all" || t.category === cat) &&
      (level === "all" || t.level === level) &&
      (!q.trim() || `${t.name} ${t.maker} ${t.what} ${t.when.join(" ")}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="pb-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-grape-500 to-rose-400 px-5 pb-8 pt-[calc(20px+var(--safe-top))] text-white">
        <div className="absolute -right-8 top-4 opacity-95"><Mascot size={120} mood="wow" /></div>
        <h1 className="font-display text-[30px] font-semibold leading-tight">Discover</h1>
        <p className="mt-1 max-w-[230px] text-[15px] font-semibold text-white/90">The right AI tool for every job — without the overwhelm.</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools or tasks, e.g. 'slides'" className="mt-4 h-12 w-full rounded-2xl bg-white/95 px-4 text-[15px] font-semibold text-ink outline-none placeholder:text-ink-mute" />
      </div>

      {recs.length > 0 && !q && cat === "all" && (
        <section className="-mt-4 px-5">
          <div className="rounded-[28px] bg-white p-4 shadow-float">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Picked for you</h2>
              <span className="text-xs font-bold text-ink-mute">Based on your goals & level</span>
            </div>
            <div className="no-scrollbar -mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-1">
              {recs.map((t) => (
                <button key={t.id} onClick={() => setOpen(t)} className="w-[132px] shrink-0 rounded-2xl bg-lav-50 p-3 text-left active:scale-[0.98] transition-transform">
                  <Mono t={t} />
                  <div className="mt-2 font-display font-semibold leading-tight">{t.name}</div>
                  <div className="line-clamp-2 text-[12px] text-ink-soft">{t.when[0]}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mt-5">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.icon} {c.label}</Chip>
          ))}
        </div>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-5">
          {(["all", "beginner", "intermediate", "advanced"] as const).map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${level === l ? "bg-ink text-white" : "bg-white text-ink-mute ring-1 ring-grape-100"}`}>
              {l === "all" ? "Any level" : l[0].toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {cat === "all" && !q && level === "all" ? (
        <div className="mt-4 space-y-6">
          {CATEGORIES.map((c) => {
            const tools = TOOLS.filter((t) => t.category === c.id);
            return (
              <section key={c.id}>
                <div className="flex items-center justify-between px-5">
                  <h2 className="font-display text-lg font-semibold">{c.icon} {c.label}</h2>
                  <button onClick={() => setCat(c.id)} className="text-sm font-bold text-grape-600">See all</button>
                </div>
                <div className="no-scrollbar mt-2 flex gap-3 overflow-x-auto px-5 pb-2">
                  {tools.map((t) => <ToolCard key={t.id} t={t} onOpen={() => setOpen(t)} />)}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 px-5">
          {list.map((t) => <ToolRow key={t.id} t={t} onOpen={() => setOpen(t)} />)}
          {list.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <Mascot size={90} mood="thinking" />
              <p className="mt-2 font-bold text-ink-soft">No tools match that yet.</p>
              <button onClick={() => { setQ(""); setCat("all"); setLevel("all"); }} className="mt-1 text-sm font-bold text-grape-600">Clear filters</button>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 px-6 text-center text-xs text-ink-mute">AIBI isn&apos;t affiliated with these companies. Features and prices change often — check each tool&apos;s website, and its privacy settings, before you sign up.</p>

      <ToolSheet tool={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Mono({ t, size = 44 }: { t: Tool; size?: number }) {
  return (
    <span className="grid place-items-center rounded-2xl font-display font-bold text-white shadow-sm" style={{ width: size, height: size, background: t.color, fontSize: size * 0.42 }}>
      {t.mono}
    </span>
  );
}

function ToolCard({ t, onOpen }: { t: Tool; onOpen: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onOpen} className="w-[200px] shrink-0 rounded-3xl bg-white p-4 text-left shadow-card">
      <div className="flex items-center justify-between">
        <Mono t={t} />
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${LEVEL_STYLE[t.level]}`}>{t.level}</span>
      </div>
      <div className="mt-3 font-display text-[17px] font-semibold">{t.name}</div>
      <div className="text-[11px] font-bold text-ink-mute">{t.maker}</div>
      <p className="mt-1 line-clamp-3 text-[13px] text-ink-soft">{t.what}</p>
    </motion.button>
  );
}

function ToolRow({ t, onOpen }: { t: Tool; onOpen: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.99 }} onClick={onOpen} className="flex items-center gap-3 rounded-3xl bg-white p-3 text-left shadow-card">
      <Mono t={t} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-[16px] font-semibold">{t.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${LEVEL_STYLE[t.level]}`}>{t.level}</span>
        </div>
        <p className="truncate text-[13px] text-ink-soft">{t.what}</p>
      </div>
    </motion.button>
  );
}

function ToolSheet({ tool, onClose }: { tool: Tool | null; onClose: () => void }) {
  const lesson = tool?.lesson ? getLesson(tool.lesson) : undefined;
  return (
    <Sheet open={!!tool} onClose={onClose}>
      {tool && (
        <div>
          <div className="flex items-center gap-3">
            <Mono t={tool} size={56} />
            <div>
              <h2 className="font-display text-2xl font-semibold">{tool.name}</h2>
              <div className="text-sm font-bold text-ink-mute">{tool.maker} · {tool.price}</div>
            </div>
          </div>
          <p className="mt-4 text-[15px] text-ink-soft">{tool.what}</p>
          <div className="mt-4 rounded-3xl bg-lav-100 p-4">
            <div className="text-xs font-black uppercase tracking-widest text-grape-600">Use it when you want to…</div>
            <ul className="mt-2 space-y-1.5">
              {tool.when.map((w) => <li key={w} className="flex gap-2 text-[15px] font-semibold"><span className="text-mint-500">✓</span>{w}</li>)}
            </ul>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-sky-100 p-3 text-[13px] font-semibold text-ink-soft">
            <span className="text-lg">🛡️</span> Check privacy settings before sharing personal or work information.
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {tool.tryMode && <Button full href={`/playground?mode=${tool.tryMode}`} onClick={onClose}>Practise this in the Playground</Button>}
            {lesson && <Button variant="secondary" full href="/learn" onClick={onClose}>Related lesson: {lesson.title}</Button>}
            <a href={tool.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2 text-sm font-bold text-grape-600">
              Visit {tool.name} <IconExternal size={15} />
            </a>
          </div>
        </div>
      )}
    </Sheet>
  );
}
