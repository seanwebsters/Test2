"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { accessibilityRules, palette, particlePresets, principles, sounds, stylePresets, timing, transitions, typography } from "@/lib/design-system/tokens";
import { createStage } from "@/runtime/stage";
import { createAudio } from "@/runtime/audio";
import type { Theme } from "@/lib/engine/schemas";

const demoTheme = (particles: Theme["particles"], sky: string[]): Theme => ({
  sky,
  ground: "#6E5A7E",
  surface: "#F4E6D4",
  accent: "#FFC979",
  accentSoft: "#E9B79A",
  ink: "#24213A",
  glow: particles === "stars" ? "#DCE3FF" : "#FFE4B0",
  particles,
  particleDensity: 0.7,
  motionTempo: 1,
  soundScale: "pentatonic",
  soundRoot: 261.63,
});

/** A live preview drawn by the same code the game runtime uses. */
function ParticlePreview({ id }: { id: Theme["particles"] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const sky = id === "stars" ? ["#0F1833", "#3E4374"] : id === "snow" ? ["#E8EEF4", "#A9BCD0"] : ["#F7D9B4", "#A988B0"];
    const stage = createStage(demoTheme(id, sky), { landscape: id !== "stars", reducedMotion: false });
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * 2;
    c.height = h * 2;
    ctx.scale(2, 2);
    stage.resize(w, h);
    let raf = 0, t = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      stage.drawBackground(ctx, t);
      stage.drawAmbient(ctx, t, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return <canvas ref={ref} className="h-32 w-full rounded-2xl" aria-hidden />;
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="mb-6 font-display text-3xl font-light text-midnight">{title}</h2>
      {children}
    </section>
  );
}

export default function StylesPage() {
  const audio = useRef<ReturnType<typeof createAudio> | null>(null);
  const [replay, setReplay] = useState<Record<string, number>>({});
  const play = (id: string) => {
    audio.current ??= createAudio(demoTheme("none", ["#fff", "#fff"]));
    const a = audio.current;
    if (id === "touch") a.touch(2);
    if (id === "connect") a.connect();
    if (id === "miss") a.miss();
    if (id === "complete") a.complete();
  };
  return (
    <Page>
      <PageHeader eyebrow="Style library" title="The Calm design system" description="Shared by the studio and every game it makes. The game runtime reads these tokens directly, so a new game inherits the same light, motion and sound." />

      <Section eyebrow="Principles" title="How Calm games should feel">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((p, i) => (
            <div key={p.title} className="rounded-3xl border border-line/70 bg-paper/70 p-5">
              <p className="font-display text-3xl text-lavender">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-3 text-[14.5px] font-medium text-midnight">{p.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Colour" title="Tokens">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(palette).map(([name, hex]) => (
            <div key={name} className="overflow-hidden rounded-3xl border border-line/70 bg-paper">
              <div className="h-24" style={{ background: hex }} />
              <div className="p-3"><p className="text-[13px] font-medium capitalize text-midnight">{name.replace(/([A-Z])/g, " $1")}</p><p className="font-mono text-[11.5px] text-muted">{hex}</p></div>
            </div>
          ))}
        </div>
        <p className="eyebrow mt-10 mb-4">Starting palettes for the Art Director</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stylePresets.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-3xl border border-line/70">
              <div className="relative h-28" style={{ background: `linear-gradient(${s.sky.join(",")})` }}>
                <span className="absolute bottom-3 left-3 size-5 rounded-full" style={{ background: s.accent, boxShadow: `0 0 18px ${s.accent}` }} />
              </div>
              <p className="bg-paper p-3 text-[13px] text-midnight">{s.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Typography" title="Editorial, unhurried type">
        <div className="space-y-5 rounded-3xl border border-line/70 bg-paper/70 p-7">
          {typography.scale.map((t) => (
            <div key={t.name} className="flex flex-col gap-1 border-b border-line/60 pb-5 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-8">
              <span className="eyebrow w-24 shrink-0">{t.name} · {t.size}</span>
              <span className={t.name === "Body" || t.name === "Caption" ? "" : "font-display text-midnight"} style={{ fontSize: t.size, lineHeight: t.leading, letterSpacing: t.tracking, textTransform: t.name === "Caption" ? "uppercase" : undefined }}>
                {t.name === "Body" ? "Every interaction should have a soft, satisfying response." : t.name === "Caption" ? "Level two of three" : "Light finds its way home"}
              </span>
            </div>
          ))}
          <p className="text-[13px] text-muted">{typography.display.family} for {typography.display.use.toLowerCase()}; {typography.text.family} for {typography.text.use.toLowerCase()}. Inside games (which load no web fonts) the runtime uses a system serif stack.</p>
        </div>
      </Section>

      <Section eyebrow="Components" title="Buttons and indicators">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-line/70 bg-paper/70 p-7">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="ghost">Ghost</Button>
            <Badge tone="sage">QA passed</Badge>
            <Badge tone="lavender">Generating</Badge>
            <Badge tone="peach">Experimental</Badge>
          </div>
          <div className="flex items-center gap-8 rounded-3xl border border-line/70 bg-paper/70 p-7">
            <div className="relative grid size-20 place-items-center">
              <span className="absolute inset-0 animate-breathe rounded-full bg-lavender/40" />
              <span className="relative text-[11px] text-midnight">breathe</span>
            </div>
            <div className="flex-1 space-y-3">
              {[0.25, 0.6, 1].map((v) => (
                <div key={v} className="h-1.5 overflow-hidden rounded-full bg-ivory-deep">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-lavender via-peach to-coastal" initial={{ width: 0 }} whileInView={{ width: `${v * 100}%` }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Motion" title="Transitions and timing">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {transitions.map((t) => (
            <button key={t.id} onClick={() => setReplay((r) => ({ ...r, [t.id]: (r[t.id] ?? 0) + 1 }))} className="rounded-3xl border border-line/70 bg-paper/70 p-5 text-left">
              <div className="mb-4 grid h-24 place-items-center overflow-hidden rounded-2xl bg-ivory-deep">
                <motion.div
                  key={replay[t.id] ?? 0}
                  className="size-12 rounded-2xl bg-gradient-to-br from-lavender to-coastal"
                  initial={t.id === "fade-rise" ? { opacity: 0, y: 12 } : t.id === "dissolve" ? { opacity: 0 } : t.id === "bloom" ? { opacity: 0, scale: 0.8 } : { x: -80, opacity: 0 }}
                  animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                  transition={{ duration: t.duration / 1000, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="text-[14px] font-medium text-midnight">{t.name}</p>
              <p className="text-[12.5px] text-muted">{t.description} {t.duration}ms.</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{Object.entries(timing).map(([k, v]) => <Badge key={k}>{k.replace(/([A-Z])/g, " $1").toLowerCase()} · {v}ms</Badge>)}</div>
      </Section>

      <Section eyebrow="Atmosphere" title="Ambient particles">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {particlePresets.map((p) => (
            <div key={p.id} className="rounded-3xl border border-line/70 bg-paper/70 p-3">
              <ParticlePreview id={p.id} />
              <p className="mt-3 px-2 text-[14px] font-medium text-midnight">{p.name}</p>
              <p className="px-2 pb-2 text-[12.5px] text-muted">{p.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Sound" title="Interaction sounds">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sounds.map((s) => (
            <div key={s.id} className="flex flex-col rounded-3xl border border-line/70 bg-paper/70 p-5">
              <p className="text-[14px] font-medium text-midnight">{s.name}</p>
              <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-muted">{s.description}</p>
              <Button size="sm" variant="secondary" className="mt-4 self-start" onClick={() => play(s.id)}><Play /> Listen</Button>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Accessibility" title="Rules every game follows">
        <ul className="grid gap-3 md:grid-cols-2">
          {accessibilityRules.map((r) => <li key={r} className="rounded-2xl border border-line/70 bg-paper/70 px-5 py-4 text-[13.5px] leading-relaxed text-ink/85">{r}</li>)}
        </ul>
        <p className="mt-8 text-[13px] text-muted">Approved proprietary Calm assets can be imported in <Link href="/assets" className="underline underline-offset-2">Assets</Link>. The studio never scrapes artwork and has no access to internal asset libraries.</p>
      </Section>
    </Page>
  );
}
