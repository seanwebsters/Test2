"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Boxes, FlaskConical, Gamepad2, Home, Palette, Settings, Sparkles, Users, X } from "lucide-react";
import { LogoMark } from "./logo";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/client-store";

export const NAV = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/create", label: "Create Game", icon: Sparkles },
  { href: "/games", label: "My Games", icon: Gamepad2 },
  { href: "/agents", label: "AI Agents", icon: Users },
  { href: "/lab", label: "Creative Lab", icon: FlaskConical },
  { href: "/styles", label: "Style Library", icon: Palette },
  { href: "/assets", label: "Assets", icon: Boxes },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  const { sidebarOpen, setSidebarOpen } = useStudio();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <div className={cn("fixed inset-0 z-30 bg-midnight/20 backdrop-blur-sm transition-opacity lg:hidden", sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={() => setSidebarOpen(false)} />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line/70 bg-paper/90 px-4 py-5 backdrop-blur-xl transition-transform duration-500 ease-[var(--ease-calm)] lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <LogoMark />
            <span className="leading-tight">
              <span className="block font-display text-[17px] text-midnight">Calm</span>
              <span className="block text-[11px] tracking-[0.14em] text-muted uppercase">Game Studio</span>
            </span>
          </Link>
          <button className="rounded-full p-2 text-muted hover:bg-ivory-deep lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Studio">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={cn("relative flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] transition-colors", active(href) ? "text-midnight" : "text-ink/60 hover:text-ink")}
            >
              {active(href) && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-ivory-deep" transition={{ type: "spring", stiffness: 380, damping: 34 }} />}
              <Icon className="relative size-[17px]" strokeWidth={1.6} />
              <span className="relative">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="rounded-2xl bg-gradient-to-br from-lavender-soft via-peach-soft to-coastal-soft p-4">
          <p className="font-display text-[15px] text-midnight">Turn an idea into something beautiful.</p>
          <Link href="/create" className="mt-2 inline-block text-[12px] font-medium text-midnight/70 underline-offset-4 hover:underline" onClick={() => setSidebarOpen(false)}>
            Start a new game →
          </Link>
        </div>
      </aside>
    </>
  );
}
