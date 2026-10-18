"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Compass, Gift, Home, Layers, LibraryBig, Package, Search, Sparkles, TrendingUp, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { DustIcon, ShardIcon, fmt } from "@/components/ui/Currency";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { SearchBox } from "./SearchBox";
import { useViewer } from "./Viewer";

export const NAV = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/universes", label: "Universes", icon: Layers },
  { href: "/daily", label: "Daily Drops", icon: Gift },
  { href: "/packs", label: "Packs", icon: Package },
  { href: "/collection", label: "My Collection", icon: LibraryBig },
  { href: "/stories", label: "Stories", icon: BookOpen },
  { href: "/charts", label: "Charts", icon: TrendingUp },
];

const active = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

export function TopNav() {
  const path = usePathname();
  const { viewer } = useViewer();
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-4 md:px-8">
        <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg" aria-label="NEXARA home">
          <LogoMark />
          <Wordmark className="hidden sm:inline" />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 xl:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`focus-ring rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${active(path, n.href) ? "bg-white/10 text-bone" : "text-bone-3 hover:text-bone"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block">
            <SearchBox />
          </div>
          <Link href="/search" className="focus-ring grid h-10 w-10 place-items-center rounded-full text-bone-2 hover:bg-white/5 md:hidden" aria-label="Search">
            <Search size={19} />
          </Link>
          <Link href="/packs" className="focus-ring hidden items-center gap-3 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] font-bold tabular-nums sm:flex" title="Shards (earned free) and Stardust (from duplicates)">
            <span className="flex items-center gap-1.5"><ShardIcon />{fmt(viewer.wallet.shards)}</span>
            <span className="flex items-center gap-1.5 text-bone-2"><DustIcon />{fmt(viewer.wallet.stardust)}</span>
          </Link>
          <Link href="/notifications" className="focus-ring relative grid h-10 w-10 place-items-center rounded-full text-bone-2 hover:bg-white/5" aria-label={`Notifications${viewer.unread ? `, ${viewer.unread} unread` : ""}`}>
            <Bell size={19} />
            {viewer.unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 text-[10px] font-bold text-ink">{viewer.unread > 9 ? "9+" : viewer.unread}</span>}
          </Link>
          <Link href="/profile" className="focus-ring rounded-full" aria-label="Your profile">
            <Avatar seed={viewer.avatarSeed} name={viewer.displayName} size={34} />
          </Link>
        </div>
      </div>
    </header>
  );
}

const MOBILE = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/packs", label: "Packs", icon: Sparkles, primary: true },
  { href: "/collection", label: "Collection", icon: LibraryBig },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl xl:hidden" aria-label="Primary">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE.map((n) => {
          const on = active(path, n.href);
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href} className="focus-ring flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold" aria-current={on ? "page" : undefined}>
              {n.primary ? (
                <span className="-mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-ember-3 to-ember text-ink shadow-[0_10px_30px_-8px_rgba(255,106,61,.8)]">
                  <Icon size={22} />
                </span>
              ) : (
                <Icon size={21} className={on ? "text-bone" : "text-bone-4"} />
              )}
              <span className={on ? "text-bone" : "text-bone-4"}>{n.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
