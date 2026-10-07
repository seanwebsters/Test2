"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, House, Library, Sparkles, UserRound } from "lucide-react";
import { CalmMark } from "../ui/CalmMark";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/my-dreams", label: "My Dreams", icon: Library },
  { href: "/you", label: "You", icon: UserRound },
];

const IMMERSIVE = ["/play", "/morning", "/pitch", "/create", "/dream/"];

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

      <main className={immersive ? "" : "pb-nav lg:pb-16"}>{children}</main>

      {!immersive && (
        <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden" style={{ paddingBottom: "var(--safe-bottom)" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/95 to-night-950/0" />
          <div className="relative mx-auto flex max-w-md items-end justify-around px-3 pb-2 pt-3">
            {NAV.map((n) => {
              const Icon = n.icon;
              const on = active(n.href);
              if (n.href === "/create")
                return (
                  <Link key={n.href} href={n.href} className="-mt-5 flex flex-col items-center gap-1" aria-label="Create a Dream">
                    <span className="btn-dream grid h-14 w-14 place-items-center rounded-full">
                      <Sparkles className="h-6 w-6" />
                    </span>
                    <span className="text-[10px] font-medium text-mist-300">Create</span>
                  </Link>
                );
              return (
                <Link key={n.href} href={n.href} className="flex w-16 flex-col items-center gap-1 py-1">
                  <Icon className={`h-[22px] w-[22px] transition ${on ? "text-glow-300" : "text-mist-400"}`} strokeWidth={on ? 2 : 1.6} />
                  <span className={`text-[10px] font-medium ${on ? "text-glow-300" : "text-mist-400"}`}>{n.label}</span>
                  {on && <motion.span layoutId="botnav" className="h-1 w-1 rounded-full bg-glow-300" />}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
