"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatsBar } from "@/components/AppChrome";
import Mascot from "@/components/Mascot";
import { Button, Card, PlusBadge, Progress, Sheet, Toggle } from "@/components/ui";
import { Crown, Flame, Gem, IconSettings, IconShare } from "@/components/icons";
import { ALL_LESSONS, SKILL_LABELS, WORLDS } from "@/content/curriculum";
import { INTERESTS, MINUTES, type Interest } from "@/content/profile";
import { lastNDays } from "@/lib/date";
import { ACCESSORIES, ACHIEVEMENTS, accessoryUnlocked, levelInfo, unlockLabel, worldComplete, worldProgress, type Achievement } from "@/lib/gamification";
import { play } from "@/lib/feedback";
import { shareCard } from "@/lib/share";
import { liveStreak, useStore } from "@/lib/store";

export default function ProfilePage() {
  const s = useStore();
  const router = useRouter();
  const lv = levelInfo(s.xp);
  const streak = liveStreak(s);
  const lessons = Object.keys(s.completed).length;
  const accuracy = s.stats.answered ? Math.round((s.stats.correct / s.stats.answered) * 100) : 0;
  const [badge, setBadge] = useState<Achievement | null>(null);
  const [settings, setSettings] = useState(false);
  const [editName, setEditName] = useState(false);
  const days = lastNDays(7);
  const maxDay = Math.max(20, ...days.map((d) => s.xpByDay[d] ?? 0));
  const skills = Object.entries(SKILL_LABELS).map(([id, v]) => ({ id, ...v, xp: s.skillXp[id as keyof typeof s.skillXp] ?? 0 }));
  const maxSkill = Math.max(60, ...skills.map((x) => x.xp));
  const earned = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-30 bg-lav-50/85 px-4 pb-3 pt-[calc(12px+var(--safe-top))] backdrop-blur-xl">
        <StatsBar />
      </div>

      <div className="px-5">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-grape-500 via-grape-400 to-rose-400 p-5 text-white shadow-float">
          <button aria-label="Settings" onClick={() => setSettings(true)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur active:scale-95">
            <IconSettings size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="rounded-[28px] bg-white/20 p-1 backdrop-blur"><Mascot size={96} mood="happy" /></div>
            <div className="min-w-0 flex-1">
              <button onClick={() => setEditName(true)} className="truncate text-left font-display text-[26px] font-semibold leading-tight">{s.profile?.name ?? "Learner"}</button>
              <div className="flex items-center gap-2 text-sm font-bold text-white/90">Level {lv.level} · {lv.title} {s.plan === "plus" && <PlusBadge />}</div>
              <div className="mt-2"><Progress value={lv.pct} color="white" height={9} /></div>
              <div className="mt-1 text-xs font-bold text-white/80">{lv.into} / {lv.span} XP to level {lv.level + 1}</div>
            </div>
          </div>
        </div>

        {s.plan !== "plus" ? (
          <Link href="/plus" className="mt-4 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-sun-100 to-[#FFE8C2] p-4 shadow-card active:scale-[0.99] transition-transform">
            <Crown size={36} />
            <div className="flex-1">
              <div className="font-display text-lg font-semibold">Try AIBI Plus</div>
              <div className="text-sm text-ink-soft">All 8 worlds, unlimited hearts, more AI.</div>
            </div>
            <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-black text-white">£7.99/mo</span>
          </Link>
        ) : (
          <Link href="/plus" className="mt-4 flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card">
            <Crown size={32} />
            <div className="flex-1">
              <div className="font-display text-lg font-semibold">AIBI Plus · {s.planPeriod === "yearly" ? "Yearly" : "Monthly"}</div>
              <div className="text-sm text-ink-soft">Thank you for supporting AIBI 💜</div>
            </div>
            <span className="text-sm font-bold text-grape-600">Manage</span>
          </Link>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { icon: <Flame size={28} lit={streak > 0} />, value: streak, label: "Day streak" },
            { icon: <Gem size={26} />, value: s.xp, label: "Total XP" },
            { icon: <span className="text-2xl">📘</span>, value: `${lessons}/${ALL_LESSONS.length}`, label: "Lessons" },
            { icon: <span className="text-2xl">🎯</span>, value: `${accuracy}%`, label: "Accuracy" },
          ].map((t) => (
            <Card key={t.label} className="flex items-center gap-3 p-4">
              {t.icon}
              <div>
                <div className="font-display text-xl font-semibold leading-none">{t.value}</div>
                <div className="mt-1 text-xs font-bold text-ink-mute">{t.label}</div>
              </div>
            </Card>
          ))}
        </div>

        <h2 className="mt-7 font-display text-xl font-semibold">This week</h2>
        <Card className="mt-3 p-4">
          <div className="flex h-32 items-end justify-between gap-2">
            {days.map((d) => {
              const v = s.xpByDay[d] ?? 0;
              return (
                <div key={d} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-black text-ink-mute">{v || ""}</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(4, (v / maxDay) * 88)}px` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} className={`w-full rounded-xl ${v ? "bg-gradient-to-t from-grape-500 to-grape-300" : "bg-lav-100"}`} />
                  <span className="text-[11px] font-bold text-ink-mute">{new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <h2 className="mt-7 font-display text-xl font-semibold">Your AI skills</h2>
        <Card className="mt-3 space-y-3 p-4">
          {skills.map((sk) => (
            <div key={sk.id} className="flex items-center gap-3">
              <span className="w-7 text-xl">{sk.emoji}</span>
              <div className="flex-1">
                <div className="flex justify-between text-[13px] font-bold"><span>{sk.label}</span><span className="text-ink-mute">{sk.xp} XP</span></div>
                <Progress value={sk.xp / maxSkill} height={8} className="mt-1" />
              </div>
            </div>
          ))}
        </Card>

        <div className="mt-7 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">Badges</h2>
          <span className="text-sm font-bold text-ink-mute">{earned}/{ACHIEVEMENTS.length}</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const got = !!s.achievements[a.id];
            return (
              <motion.button key={a.id} whileTap={{ scale: 0.94 }} onClick={() => { play("tap"); setBadge(a); }} className="flex flex-col items-center gap-1">
                <span className={`grid h-16 w-16 place-items-center rounded-[22px] text-3xl ${got ? "shadow-card" : "grayscale opacity-40"}`} style={{ background: got ? `linear-gradient(160deg, ${a.tint}26, ${a.tint}55)` : "#EEEAF7" }}>
                  {a.icon}
                </span>
                <span className={`line-clamp-2 text-center text-[11px] font-bold leading-tight ${got ? "text-ink" : "text-ink-mute"}`}>{a.title}</span>
              </motion.button>
            );
          })}
        </div>

        <h2 className="mt-7 font-display text-xl font-semibold">Aibi&apos;s wardrobe</h2>
        <p className="text-sm text-ink-soft">Unlock accessories by levelling up and earning badges.</p>
        <Wardrobe />

        <h2 className="mt-7 font-display text-xl font-semibold">Certificates</h2>
        <p className="text-sm text-ink-soft">Earned by demonstrating skills in each world.</p>
        <div className="mt-3 space-y-3">
          {WORLDS.map((w) => {
            const done = worldComplete(s, w.id);
            const p = worldProgress(s, w.id);
            return (
              <Card key={w.id} className="flex items-center gap-3 p-3" onClick={done ? () => router.push(`/certificate/${w.id}`) : undefined}>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl ${done ? "" : "grayscale opacity-50"}`} style={{ background: `linear-gradient(135deg, ${w.theme.from}33, ${w.theme.to}33)` }}>{w.theme.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-display font-semibold">{w.title} {w.plus && <PlusBadge />}</div>
                  {done ? <div className="text-xs font-bold text-mint-600">Certificate earned · tap to view</div> : <Progress value={p} height={7} className="mt-1.5" />}
                </div>
                {done ? <span className="text-2xl">📜</span> : <span className="text-xs font-black text-ink-mute">{Math.round(p * 100)}%</span>}
              </Card>
            );
          })}
        </div>

        <Link href="/business" className="mt-7 flex items-center gap-3 rounded-3xl bg-ink p-4 text-white shadow-card">
          <span className="text-3xl">🏢</span>
          <div className="flex-1">
            <div className="font-display text-lg font-semibold">AIBI for Business</div>
            <div className="text-sm text-white/75">Train your whole team in AI literacy.</div>
          </div>
          <span className="text-sm font-bold text-lav-200">Learn more</span>
        </Link>
      </div>

      <BadgeSheet a={badge} onClose={() => setBadge(null)} />
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
      <NameSheet open={editName} onClose={() => setEditName(false)} />
    </div>
  );
}

function Wardrobe() {
  const s = useStore();
  const equip = useStore((x) => x.equip);
  const router = useRouter();
  return (
    <div className="mt-3 rounded-[28px] bg-white p-4 shadow-card">
      <div className="flex justify-center rounded-3xl bg-gradient-to-b from-lav-100 to-white py-2">
        <Mascot size={130} mood="wink" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {ACCESSORIES.map((a) => {
          const unlocked = accessoryUnlocked(a, s);
          const on = s.equipped[a.slot] === a.id;
          return (
            <button
              key={a.id}
              onClick={() => {
                play("tap");
                if (!unlocked) {
                  if (a.unlock.type === "plus") router.push("/plus");
                  return;
                }
                equip(a.slot, on ? undefined : a.id);
              }}
              className={`relative flex flex-col items-center rounded-2xl border-2 p-2 transition-all ${on ? "border-grape-400 bg-grape-50" : "border-transparent bg-lav-50"} ${unlocked ? "" : "opacity-60"}`}
            >
              <div className={unlocked ? "" : "grayscale"}>
                <Mascot size={58} float={false} equipped={{ [a.slot]: a.id }} mood="happy" />
              </div>
              <span className="mt-1 text-center text-[11px] font-black leading-tight">{a.name}</span>
              {!unlocked && <span className="mt-0.5 text-center text-[9.5px] font-bold leading-tight text-ink-mute">{unlockLabel(a)}</span>}
              {a.unlock.type === "plus" && <span className="absolute right-1 top-1"><Crown size={14} /></span>}
              {on && <span className="absolute left-1 top-1 rounded-full bg-grape-500 px-1.5 text-[9px] font-black text-white">ON</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BadgeSheet({ a, onClose }: { a: Achievement | null; onClose: () => void }) {
  const got = useStore((s) => (a ? s.achievements[a.id] : undefined));
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={!!a} onClose={onClose}>
      {a && (
        <div className="flex flex-col items-center pb-2 text-center">
          <span className={`grid h-28 w-28 place-items-center rounded-[36px] text-6xl ${got ? "" : "grayscale opacity-50"}`} style={{ background: `linear-gradient(160deg, ${a.tint}26, ${a.tint}66)` }}>{a.icon}</span>
          <h2 className="mt-3 font-display text-2xl font-semibold">{a.title}</h2>
          <p className="text-ink-soft">{a.desc}</p>
          <p className="mt-1 text-sm font-bold text-ink-mute">{got ? `Earned ${new Date(got).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : "Not earned yet — keep going!"}</p>
          {got && (
            <Button
              full
              className="mt-5"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await shareCard({ eyebrow: "Badge earned", title: a.title, subtitle: a.desc, badge: a.icon, accent: a.tint }, `I earned the "${a.title}" badge on AIBI ${a.icon}`);
                setBusy(false);
              }}
            >
              <IconShare size={18} /> {busy ? "Preparing…" : "Share badge"}
            </Button>
          )}
        </div>
      )}
    </Sheet>
  );
}

function NameSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const name = useStore((s) => s.profile?.name ?? "");
  const update = useStore((s) => s.updateProfile);
  const [v, setV] = useState(name);
  useEffect(() => {
    setV(name);
  }, [name, open]);
  return (
    <Sheet open={open} onClose={onClose} title="Your name">
      <input value={v} onChange={(e) => setV(e.target.value)} maxLength={30} className="h-14 w-full rounded-2xl border-2 border-grape-100 px-4 font-display text-xl font-semibold outline-none focus:border-grape-400" />
      <p className="mt-2 text-sm text-ink-mute">Shown on your certificates and the leaderboard.</p>
      <Button full className="mt-4" disabled={!v.trim()} onClick={() => { update({ name: v.trim() }); onClose(); }}>Save</Button>
    </Sheet>
  );
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const toggleInterest = (i: Interest) => {
    const cur = s.profile?.interests ?? [];
    const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
    if (next.length) s.updateProfile({ interests: next });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-ink-mute">Daily goal</div>
          <div className="grid grid-cols-2 gap-2">
            {MINUTES.map((m) => (
              <button key={m.id} onClick={() => s.updateProfile({ minutes: m.id })} className={`rounded-2xl border-2 px-3 py-2.5 text-left ${s.profile?.minutes === m.id ? "border-grape-400 bg-grape-50" : "border-grape-100"}`}>
                <div className="text-sm font-black">{m.title}</div>
                <div className="text-xs text-ink-mute">{m.goalXp} XP a day</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-ink-mute">Interests</div>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => {
              const on = s.profile?.interests.includes(i.id);
              return (
                <button key={i.id} onClick={() => toggleInterest(i.id)} className={`rounded-full px-3 py-1.5 text-sm font-bold ${on ? "bg-grape-500 text-white" : "bg-lav-100 text-ink-soft"}`}>
                  {i.icon} {i.title}
                </button>
              );
            })}
          </div>
        </div>
        <div className="divide-y divide-grape-100 rounded-2xl bg-lav-50">
          <div className="flex items-center justify-between p-3.5"><span className="font-bold">Sound effects</span><Toggle label="Sound effects" on={s.settings.sound} onChange={(v) => s.setSetting("sound", v)} /></div>
          <div className="flex items-center justify-between p-3.5"><span className="font-bold">Haptics</span><Toggle label="Haptics" on={s.settings.haptics} onChange={(v) => s.setSetting("haptics", v)} /></div>
        </div>
        <div className="rounded-2xl bg-lav-50 p-3.5">
          <div className="font-bold">Install AIBI</div>
          {installed ? (
            <p className="text-sm text-ink-soft">AIBI is installed on this device. 🎉</p>
          ) : bip ? (
            <Button size="md" className="mt-2" onClick={async () => { await bip.prompt(); setBip(null); }}>Add to home screen</Button>
          ) : (
            <p className="text-sm text-ink-soft">{isIOS ? "In Safari, tap Share → 'Add to Home Screen' to install AIBI like an app." : "Use your browser menu → 'Install app' or 'Add to Home screen' to install AIBI."}</p>
          )}
        </div>
        <div className="rounded-2xl bg-lav-50 p-3.5 text-sm text-ink-soft">
          <div className="font-bold text-ink">Your data</div>
          Your progress is stored privately on this device. Nothing you type in lessons is saved by AIBI; prompts are sent to the AI service only to generate responses.
        </div>
        {confirm ? (
          <div className="rounded-2xl bg-coral-100 p-4">
            <div className="font-bold">Reset all progress?</div>
            <p className="text-sm text-ink-soft">This deletes your XP, streak, badges and lesson history on this device. It can&apos;t be undone.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="danger" size="md" onClick={() => { s.reset(); onClose(); router.replace("/welcome"); }}>Reset everything</Button>
              <Button variant="secondary" size="md" onClick={() => setConfirm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className="w-full py-2 text-center text-sm font-bold text-coral-600">Reset progress</button>
        )}
      </div>
    </Sheet>
  );
}
