import Link from "next/link";
import { Briefcase, Compass, Flame, Home, MessageCircle, Route, Sparkles, Target, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NavLink } from "./NavLink";

export interface ShellStats {
  streak: number;
  streakAlive: boolean;
  doneToday: boolean;
  xp: number;
  plan: "free" | "plus";
  name: string;
}

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/path", label: "My Path", icon: Route },
  { href: "/missions", label: "Missions", icon: Target },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/opportunities", label: "Opportunities", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const MOBILE = NAV.slice(0, 5);

export function AppShell({ stats, children }: { stats: ShellStats | null; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <Link href={stats ? "/home" : "/"} className="mb-8 px-2">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} variant="side">
              <n.icon size={20} /> {n.label}
            </NavLink>
          ))}
        </nav>
        {stats && stats.plan === "free" && (
          <Link href="/plus" className="mt-auto rounded-3xl bg-gradient-to-br from-lavender-soft to-mint-soft p-4">
            <div className="flex items-center gap-2 font-display font-bold">
              <Sparkles size={16} className="text-lavender" /> Direction Plus
            </div>
            <p className="mt-1 text-xs text-ink-2">More paths, unlimited coaching and interview practice.</p>
          </Link>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href={stats ? "/home" : "/"} className="lg:hidden" aria-label="Direction home">
              <Logo compact />
            </Link>
            <div className="hidden lg:block" />
            {stats ? (
              <div className="flex items-center gap-2">
                <Link href="/profile#streak" className={`chip !py-1 ${stats.doneToday ? "!border-coral/40 !bg-coral-soft !text-coral" : ""}`} aria-label={`${stats.streak} day streak`}>
                  <Flame size={16} className={stats.streakAlive ? "text-coral" : "text-ink-3"} /> {stats.streak}
                </Link>
                <Link href="/profile" className="chip !py-1" aria-label={`${stats.xp} XP`}>
                  <span className="text-teal">✦</span> {stats.xp.toLocaleString()} XP
                </Link>
                <Link href="/opportunities" className="chip !p-2 lg:hidden" aria-label="Opportunities">
                  <Briefcase size={16} />
                </Link>
                <Link href="/profile" className="grid h-9 w-9 place-items-center rounded-full bg-ink font-display text-sm font-bold text-bg lg:hidden" aria-label="Your profile">
                  {stats.name.slice(0, 1).toUpperCase()}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/signin" className="btn-ghost btn-sm">
                  Sign in
                </Link>
                <Link href="/onboarding" className="btn-primary btn-sm">
                  Get started
                </Link>
              </div>
            )}
          </div>
        </header>

        <main id="main" className="mx-auto max-w-5xl px-4 pb-32 pt-5 lg:pb-16">
          {children}
        </main>

        {/* Mobile bottom nav */}
        {stats && (
          <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-md lg:hidden">
            <div className="mx-auto grid max-w-md grid-cols-5 px-2 pt-1.5">
              {MOBILE.map((n) => (
                <NavLink key={n.href} href={n.href} variant="bottom">
                  <n.icon size={22} />
                  <span className="text-[11px] font-bold">{n.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
