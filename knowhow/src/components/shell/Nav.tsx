"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, Flame, Headphones, Home, Orbit, User, Wand2, Zap } from "@/components/ui/Icon";
import { useApp } from "@/components/providers/AppState";
import { levelProgress } from "@/lib/gamification";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";

export const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/listen", label: "Listen", icon: Headphones },
  { href: "/universe", label: "My Universe", icon: Orbit },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/profile") return pathname.startsWith("/profile") || pathname.startsWith("/wallet") || pathname.startsWith("/plus") || pathname.startsWith("/wrapped");
  if (href === "/listen") return pathname.startsWith("/listen") || pathname.startsWith("/ai/") || pathname.startsWith("/make");
  return pathname.startsWith(href);
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("display inline-flex items-baseline text-cream", className)} aria-label="KNOWHOW">
      KNOW<span className="text-lime">HOW</span>
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 z-40 flex justify-center px-3 md:hidden" style={{ bottom: "calc(10px + var(--safe-bottom))" }}>
      <div className="flex w-full max-w-md items-center justify-between rounded-full border border-white/10 bg-[#1D1D22]/85 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("relative flex h-12 items-center justify-center rounded-full px-3.5 text-cream-dim transition-colors", active && "text-ink")}>
              {active && <motion.span layoutId="bnav" className="absolute inset-0 rounded-full bg-lime" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
              <span className="relative flex items-center gap-1.5">
                <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                {active && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} className="overflow-hidden whitespace-nowrap text-[13px] font-bold">
                    {label === "My Universe" ? "Universe" : label}
                  </motion.span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { state } = useApp();
  const lp = state ? levelProgress(state.xp) : null;
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[84px] flex-col border-r border-white/[0.06] bg-ink/90 px-3 py-6 backdrop-blur-xl md:flex xl:w-[248px] xl:px-5">
      <Link href="/" className="mb-10 px-2">
        <Logo className="hidden text-[22px] xl:inline-flex" />
        <span className="display grid h-11 w-11 place-items-center rounded-2xl bg-lime text-lg text-ink xl:hidden">K</span>
      </Link>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("group relative flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] font-semibold text-cream-dim transition-colors hover:text-cream", active && "text-ink hover:text-ink")} title={label}>
              {active && <motion.span layoutId="snav" className="absolute inset-0 rounded-2xl bg-lime" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <Icon size={21} strokeWidth={active ? 2.4 : 1.9} className="relative shrink-0 transition-transform group-hover:scale-110" />
              <span className="relative hidden xl:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      <Link href="/make" className="group mt-6 hidden overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#B6A1FF,#FF92C7)] p-4 text-ink transition-transform hover:-rotate-1 hover:scale-[1.02] xl:block">
        <Wand2 size={20} className="mb-6 transition-transform group-hover:rotate-12" />
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">AI series</div>
        <div className="display-soft text-[17px] font-bold leading-tight">Make me smarter about…</div>
      </Link>
      <Link href="/make" className="mt-6 grid h-12 w-12 place-items-center self-center rounded-2xl bg-[linear-gradient(135deg,#B6A1FF,#FF92C7)] text-ink xl:hidden" title="Make me smarter about…">
        <Wand2 size={20} />
      </Link>
      <div className="mt-auto">
        {state && lp && (
          <Link href="/profile" className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-white/5">
            <Avatar name={state.displayName} hue={state.avatarHue} className="h-10 w-10 text-sm" />
            <div className="hidden min-w-0 flex-1 xl:block">
              <div className="truncate text-sm font-semibold">{state.displayName}</div>
              <div className="flex items-center gap-2 text-xs text-cream-mute">
                <span className="flex items-center gap-0.5 text-lime"><Zap size={12} /> Lv {lp.level}</span>
                <span className="flex items-center gap-0.5 text-coral"><Flame size={12} /> {state.streak.current}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-lime" style={{ width: `${Math.round(lp.pct * 100)}%` }} />
              </div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
