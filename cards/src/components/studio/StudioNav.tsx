"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, CalendarClock, Layers, LayoutDashboard, Settings, Sparkles, SquareStack, Users } from "lucide-react";

const ITEMS = [
  { href: "/studio", label: "Overview", icon: LayoutDashboard },
  { href: "/studio/universes", label: "Universes", icon: Layers },
  { href: "/studio/generate", label: "AI Studio", icon: Sparkles },
  { href: "/studio/cards", label: "Card Sets", icon: SquareStack },
  { href: "/studio/stories", label: "Stories", icon: BookOpen },
  { href: "/studio/releases", label: "Releases", icon: CalendarClock },
  { href: "/studio/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/studio/users", label: "Users", icon: Users },
  { href: "/studio/settings", label: "Economy & Settings", icon: Settings },
];

export function StudioNav() {
  const path = usePathname();
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Studio">
      {ITEMS.map((i) => {
        const on = i.href === "/studio" ? path === "/studio" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={`focus-ring flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold ${on ? "bg-white/10 text-bone" : "text-bone-3 hover:bg-white/5 hover:text-bone"}`} aria-current={on ? "page" : undefined}>
            <i.icon size={16} /> {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
