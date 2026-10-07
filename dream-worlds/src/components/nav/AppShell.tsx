"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, House, Library, Sparkles, UserRound } from "lucide-react";
import { CalmMark } from "../ui/CalmMark";
import { MiniPlayer } from "./MiniPlayer";
import { haptic } from "@/lib/ui/haptics";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/my-dreams", label: "My Dreams", icon: Library },
  { href: "/you", label: "You", icon: UserRound },
];

/** Full-screen flows: no tab bar, like modal stacks in a native app. */
const IMMERSIVE = ["/play", "/morning", "/pitch", "/create", "/dream/", "/device"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const immersive = IMMERSIVE.some((p) => path.startsWith(p));
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      {!immersive && (
        <header className="fixed inset-x-0 top-0 z-40 hidden lg:block">
          <div className="mx-auto flex h-20 max-w-[1480px] items-center gap-10 px-10">
            <Link href="/" className="flex items-center gap-3">
              <CalmMark className="h-7" />
              <span className="h-5 w-px bg-white/15" />
              <span className="font-display text-lg tracking-wide text-mist-100">Dream Worlds</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.filter((n) => n.href !== "/create").map((n) => (
                <Link key={n.href} href={n.href} className={`relative rounded-full px-4 py-2 text-sm transition ${active(n.href) ? "text-white" : "text-mist-300 hover:text-white"}`}>
                  {active(n.href) && <motion.span layoutId="topnav" className="absolute inset-0 rounded-full bg-white/[0.07]" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                  <span className="relative">{n.label}</span>
                </Link>
              ))}
            </nav>
            <Link href="/create" className="btn-dream ml-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> Create a Dream
            </Link>
          </div>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-night-950/90 via-night-950/50 to-transparent backdrop-blur-[2px]" />
        </header>
      )}

      {/* opacity-only transition: transforms would break position:fixed screens like the player */}
      <motion.main key={path} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, ease: "easeOut" }} className={immersive ? "" : "pb-nav lg:pb-16"}>
        {children}
      </motion.main>

      {!immersive && (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
          <MiniPlayer />
          <nav className="border-t border-white/[0.07] bg-night-950/90 backdrop-blur-2xl backdrop-saturate-150" style={{ paddingBottom: "var(--safe-bottom)" }} aria-label="Tabs">
            <div className="mx-auto flex h-[var(--tabbar)] max-w-md items-center justify-around px-2">
              {NAV.map((n) => {
                const Icon = n.icon;
                const on = active(n.href);
                if (n.href === "/create")
                  return (
                    <Link key={n.href} href={n.href} onClick={() => haptic("medium")} className="press flex w-16 flex-col items-center gap-1" aria-label="Create a Dream">
                      <span className="btn-dream grid h-10 w-10 place-items-center rounded-[14px]">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] font-medium text-mist-300">Create</span>
                    </Link>
                  );
                return (
                  <Link key={n.href} href={n.href} onClick={() => haptic()} className="press relative flex h-full w-16 flex-col items-center justify-center gap-1">
                    {on && <motion.span layoutId="tabglow" className="absolute top-0 h-[2px] w-6 rounded-full bg-glow-300" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                    <Icon className={`h-[23px] w-[23px] transition-colors ${on ? "text-white" : "text-mist-400"}`} strokeWidth={on ? 2 : 1.6} />
                    <span className={`text-[10px] font-medium ${on ? "text-white" : "text-mist-400"}`}>{n.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
