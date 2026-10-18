"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/providers/AppState";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { KnowledgeCard } from "@/components/cards/KnowledgeCard";
import { Avatar } from "@/components/ui/Avatar";
import { ArrowUpRight, Crown, Flame, Gift, Layers, LogOut, Pencil, Sparkles, Trash2, Wallet, X, Zap } from "@/components/ui/Icon";
import { cardView } from "@/lib/cards";
import { MILESTONE_CARDS, RARITY_ORDER, levelProgress } from "@/lib/gamification";
import { CATEGORY_BY_ID } from "@/content/categories";
import { cn, fmtMinutes } from "@/lib/cn";

export function ProfileView() {
  const { state, api, toast } = useApp();
  const { bySlug, byEpisode } = useCatalog();
  const [editing, setEditing] = useState(false);
  const [cardFilter, setCardFilter] = useState<"all" | (typeof RARITY_ORDER)[number]>("all");

  const cards = useMemo(() => {
    if (!state) return [];
    return [...state.cards]
      .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.unlockedAt.localeCompare(a.unlockedAt))
      .map((c) => ({ c, v: cardView(c.key, c.rarity, bySlug) }))
      .filter((x) => x.v && (cardFilter === "all" || x.c.rarity === cardFilter));
  }, [state, bySlug, cardFilter]);
  const lockedMilestones = useMemo(() => Object.entries(MILESTONE_CARDS).filter(([k]) => !state?.cards.some((c) => c.key === k)).slice(0, 4), [state]);

  if (!state) return <div className="p-4 md:p-10"><div className="skeleton h-40" /><div className="skeleton mt-4 h-64" /></div>;

  const lp = levelProgress(state.xp);
  const totalSeconds = Object.values(state.days).reduce((a, b) => a + b, 0);
  const finished = Object.values(state.progress).filter((p) => p.completed).length;
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${state.today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString(undefined, { weekday: "narrow", timeZone: "UTC" }), secs: state.days[key] ?? 0 };
  });

  const removeInsight = async (id: string) => {
    await api(`/api/insights?id=${id}`, { method: "DELETE" });
    toast({ title: "Insight removed", tone: "plain" });
  };
  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="pb-safe-nav px-4 pt-[calc(20px+var(--safe-top))] md:px-10 md:pt-10">
      <header className="flex flex-col gap-5 md:flex-row md:items-center">
        <Avatar name={state.displayName} hue={state.avatarHue} className="h-24 w-24 text-3xl md:h-28 md:w-28" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="display text-[34px] md:text-[48px]">{state.displayName}</h1>
            {state.plus && <span className="chip border-transparent bg-lime text-ink"><Crown size={12} /> PLUS</span>}
          </div>
          <div className="mt-1 text-cream-dim">@{state.handle} · {lp.title}</div>
          {state.bio && <p className="mt-2 max-w-lg text-sm text-cream-dim">{state.bio}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setEditing(true)} className="btn-ghost h-10 px-4"><Pencil size={14} /> Edit profile</button>
            <Link href={`/u/${state.handle}`} className="btn-ghost h-10 px-4">Public profile <ArrowUpRight size={14} /></Link>
            {state.signedIn ? (
              <button onClick={signOut} className="btn-ghost h-10 px-4"><LogOut size={14} /> Sign out</button>
            ) : (
              <Link href="/sign-in" className="btn-ghost h-10 px-4">Save your progress</Link>
            )}
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-[28px] bg-lime p-6 text-ink">
          <div className="absolute -right-6 -top-10 text-[180px] font-black leading-none opacity-10" aria-hidden>{lp.level}</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-60">Level {lp.level}</div>
          <div className="display mt-1 text-4xl">{lp.title}</div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-ink/15">
            <motion.div initial={{ width: 0 }} animate={{ width: `${lp.pct * 100}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full rounded-full bg-ink" />
          </div>
          <div className="mt-2 flex justify-between text-sm font-semibold"><span className="flex items-center gap-1"><Zap size={14} /> {state.xp} XP</span><span className="opacity-60">{lp.next - state.xp} to level {lp.level + 1}</span></div>
        </div>
        <div className="rounded-[28px] bg-ink-2 p-6">
          <div className="flex items-center gap-3">
            <motion.div animate={state.streak.current > 0 ? { scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] } : {}} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }} className="grid h-14 w-14 place-items-center rounded-2xl bg-coral text-ink"><Flame size={28} /></motion.div>
            <div>
              <div className="display text-4xl">{state.streak.current}<span className="ml-1 text-base font-semibold normal-case text-cream-dim">day streak</span></div>
              <div className="text-xs text-cream-mute">Longest: {state.streak.longest} days · listen 1 min a day to keep it</div>
            </div>
          </div>
          <div className="mt-5 flex justify-between">
            {last7.map((d) => (
              <div key={d.key} className="flex flex-col items-center gap-1.5">
                <div className={cn("grid h-9 w-9 place-items-center rounded-full text-xs font-bold", d.secs >= 60 ? "bg-coral text-ink" : d.key === state.today ? "border-2 border-dashed border-coral/50" : "bg-white/[0.06]")}>{d.secs >= 60 ? <Flame size={14} /> : ""}</div>
                <span className="text-[11px] text-cream-mute">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Listened", fmtMinutes(totalSeconds)],
          ["Episodes finished", finished],
          ["Series completed", state.completedSeries.length],
          ["Insights saved", state.insights.length],
          ["Universes explored", `${state.exploredCategories.length}/10`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[24px] bg-ink-2 p-4">
            <div className="display text-3xl">{v}</div>
            <div className="mt-1 text-xs text-cream-mute">{k}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Link href="/wrapped" className="group relative overflow-hidden rounded-[28px] p-5 text-ink md:col-span-1" style={{ background: "linear-gradient(135deg,#FF92C7,#FF7768 60%,#DFFF57)" }}>
          <Gift size={22} />
          <div className="display mt-6 text-2xl">Your Brain Wrapped</div>
          <div className="text-sm opacity-75">Your listening, made shareable.</div>
          <ArrowUpRight className="absolute right-5 top-5 transition group-hover:rotate-45" />
        </Link>
        <Link href="/wallet" className="group relative rounded-[28px] bg-ink-2 p-5 transition hover:bg-ink-3">
          <Wallet size={22} className="text-lime" />
          <div className="display mt-6 text-2xl">{state.credits} credits</div>
          <div className="text-sm text-cream-dim">Wallet & purchases</div>
          <ArrowUpRight className="absolute right-5 top-5 text-cream-mute" />
        </Link>
        <Link href={state.plus ? "/wallet" : "/plus"} className="group relative rounded-[28px] bg-ink-2 p-5 transition hover:bg-ink-3">
          <Crown size={22} className="text-lime" />
          <div className="display mt-6 text-2xl">{state.plus ? "KNOWHOW+" : "Go Plus"}</div>
          <div className="text-sm text-cream-dim">{state.plus ? (state.subscription.status === "canceled" ? `Ends ${new Date(state.subscription.renewsAt!).toLocaleDateString()}` : `Renews ${state.subscription.renewsAt ? new Date(state.subscription.renewsAt).toLocaleDateString() : ""}`) : `Unlimited listening · £9.99/mo · ${Math.round((state.todaySeconds / state.dailyLimitSeconds) * 100)}% of today's free time used`}</div>
          <ArrowUpRight className="absolute right-5 top-5 text-cream-mute" />
        </Link>
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Knowledge cards</h2>
            <p className="text-sm text-cream-dim">Earned by finishing series, exploring new universes and real milestones.</p>
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {(["all", ...RARITY_ORDER] as const).map((r) => (
              <button key={r} onClick={() => setCardFilter(r)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize", cardFilter === r ? "bg-cream text-ink" : "bg-white/[0.06] text-cream-dim")}>{r}</button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map(({ c, v }) => <KnowledgeCard key={c.id} card={v!} unlockedAt={c.unlockedAt} />)}
          {cardFilter === "all" && lockedMilestones.map(([k, m]) => <KnowledgeCard key={k} card={cardView(k, m.rarity, bySlug)!} locked />)}
        </div>
        {cards.length === 0 && cardFilter === "all" && <p className="mt-4 text-sm text-cream-mute">Finish your first episode to earn your first card.</p>}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Saved insights</h2>
        <p className="text-sm text-cream-dim">The facts you decided were worth keeping.</p>
        {state.insights.length === 0 ? (
          <div className="mt-4 rounded-[24px] border border-dashed border-white/15 p-5 text-sm text-cream-dim">Tap the bookmark on any caption line while listening to save it here.</div>
        ) : (
          <div className="mt-5 columns-1 gap-3 sm:columns-2 lg:columns-3">
            {[...state.insights].reverse().map((i) => {
              const ep = byEpisode[i.episodeId];
              const s = ep ? bySlug[ep.seriesSlug] : null;
              const color = s ? CATEGORY_BY_ID[s.category].color : "#B6A1FF";
              return (
                <div key={i.id} className="group relative mb-3 break-inside-avoid rounded-[24px] p-5" style={{ background: `linear-gradient(160deg, ${color}22, #1D1D22 60%)` }}>
                  <Sparkles size={16} style={{ color }} />
                  <p className="editorial mt-2 text-[22px] leading-snug">{i.text}</p>
                  <div className="mt-3 text-xs text-cream-mute">{s ? `${s.title} · Ep ${ep!.n}` : "Your AI series"} · {new Date(i.savedAt).toLocaleDateString()}</div>
                  <button onClick={() => removeInsight(i.id)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-cream-mute opacity-0 transition hover:bg-white/10 hover:text-coral group-hover:opacity-100 focus:opacity-100" aria-label="Remove insight"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-3 md:grid-cols-2">
        <Link href="/collections" className="flex items-center gap-4 rounded-[24px] bg-ink-2 p-5 hover:bg-ink-3">
          <Layers className="text-bubblegum" />
          <div className="flex-1"><div className="font-bold">Collections</div><div className="text-sm text-cream-dim">Curate public playlists. Follow other people&apos;s.</div></div>
          <ArrowUpRight className="text-cream-mute" />
        </Link>
        <div className="rounded-[24px] bg-ink-2 p-5">
          <div className="font-bold">Recent XP</div>
          <ul className="mt-2 space-y-1 text-sm">
            {[...state.xpLog].reverse().slice(0, 5).map((x, i) => (
              <li key={i} className="flex justify-between gap-3 text-cream-dim"><span className="truncate">{x.reason}</span><span className="shrink-0 font-semibold text-lime">+{x.amount}</span></li>
            ))}
            {state.xpLog.length === 0 && <li className="text-cream-mute">Nothing yet. Press play.</li>}
          </ul>
        </div>
      </section>

      <AnimatePresence>{editing && <EditProfile onClose={() => setEditing(false)} />}</AnimatePresence>
    </div>
  );
}

function EditProfile({ onClose }: { onClose: () => void }) {
  const { state, api, toast } = useApp();
  const [displayName, setName] = useState(state!.displayName);
  const [handle, setHandle] = useState(state!.handle);
  const [bio, setBio] = useState(state!.bio);
  const [isPublic, setPublic] = useState(state!.isPublic);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await api("/api/me", { method: "PATCH", body: { displayName, handle, bio, isPublic } });
      toast({ title: "Profile updated", tone: "lime" });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[65] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center" onClick={onClose}>
      <motion.form initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void save(); }} className="w-full max-w-md rounded-t-[32px] bg-ink-2 p-6 pb-[calc(24px+var(--safe-bottom))] md:rounded-[32px]">
        <div className="flex items-center justify-between"><h2 className="display text-2xl">Edit profile</h2><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Close"><X size={16} /></button></div>
        {[
          ["Name", displayName, setName, 40],
          ["Handle", handle, setHandle, 24],
        ].map(([label, value, set, max]) => (
          <label key={label as string} className="mt-4 block text-sm font-semibold">
            {label as string}
            <input value={value as string} maxLength={max as number} onChange={(e) => (set as (v: string) => void)(e.target.value)} className="mt-1.5 w-full rounded-2xl bg-black/30 px-4 py-3 font-normal outline-none focus:ring-1 focus:ring-lime" />
          </label>
        ))}
        <label className="mt-4 block text-sm font-semibold">
          Bio
          <textarea value={bio} maxLength={160} onChange={(e) => setBio(e.target.value)} rows={2} className="mt-1.5 w-full resize-none rounded-2xl bg-black/30 px-4 py-3 font-normal outline-none focus:ring-1 focus:ring-lime" />
        </label>
        <label className="mt-4 flex items-center justify-between text-sm font-semibold">
          Public profile
          <button type="button" role="switch" aria-checked={isPublic} onClick={() => setPublic((v) => !v)} className={cn("relative h-7 w-12 rounded-full transition", isPublic ? "bg-lime" : "bg-white/15")}>
            <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-ink transition-all", isPublic ? "left-6" : "left-1")} />
          </button>
        </label>
        {error && <p className="mt-3 text-sm text-coral">{error}</p>}
        <button type="submit" className="btn-lime mt-6 w-full">Save</button>
      </motion.form>
    </motion.div>
  );
}
