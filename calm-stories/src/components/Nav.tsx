"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PublicViewer } from "@/lib/auth/viewer";
import { cx } from "@/lib/util";
import { Logo } from "./Logo";
import { BellIcon, SearchIcon } from "./icons";
import { Avatar } from "./Avatar";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Series" },
  { href: "/create", label: "Create" },
  { href: "/library", label: "My Library" },
];

export interface Persona {
  userId: string;
  label: string;
  description: string;
}

export function Nav({ viewer, personas, demoAuth, unread = 0 }: { viewer: PublicViewer; personas: readonly Persona[]; demoAuth: boolean; unread?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/discover" && pathname.startsWith("/series")));
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-night/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-4 px-4 sm:px-6 lg:px-10">
        <Logo />
        <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className={cx("rounded-full px-4 py-2 text-sm transition", isActive(l.href) ? "bg-white/10 text-white" : "text-mist hover:text-white")}>
              {l.label}
            </Link>
          ))}
        </nav>
        <form
          role="search"
          className="ml-auto hidden w-full max-w-xs items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 focus-within:border-lavender/60 sm:flex"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/discover?q=${encodeURIComponent(q)}`);
          }}
        >
          <SearchIcon size={16} className="text-mist" />
          <label htmlFor="nav-search" className="sr-only">
            Search series, creators and genres
          </label>
          <input id="nav-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stories" className="w-full bg-transparent text-sm text-white placeholder:text-mist/70 focus:outline-none" />
        </form>
        <Link href="/discover" className="ml-auto rounded-full p-2 text-mist hover:text-white sm:hidden" aria-label="Search">
          <SearchIcon size={20} />
        </Link>
        <PlanBadge viewer={viewer} />
        {viewer.id && (
          <Link href="/notifications" className="relative rounded-full p-2 text-mist hover:text-white" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
            <BellIcon size={20} />
            {unread > 0 && <span aria-hidden className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-lavender px-1 text-center text-[10px] font-semibold leading-4 text-night">{unread > 9 ? "9+" : unread}</span>}
          </Link>
        )}
        <AccountMenu viewer={viewer} personas={personas} demoAuth={demoAuth} />
      </div>
      <nav aria-label="Primary mobile" className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className={cx("shrink-0 rounded-full px-3 py-1.5 text-sm", isActive(l.href) ? "bg-white/10 text-white" : "text-mist")}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function PlanBadge({ viewer }: { viewer: PublicViewer }) {
  if (viewer.isPremium)
    return (
      <span className="hidden shrink-0 rounded-full border border-lavender/40 bg-lavender/10 px-3 py-1 text-xs font-medium text-lavender lg:inline" title="Mock entitlement for the prototype">
        Calm Premium
      </span>
    );
  return (
    <Link href="/settings#subscription" className="hidden shrink-0 rounded-full bg-gradient-to-r from-lavender to-periwinkle px-3 py-1 text-xs font-semibold text-night lg:inline">
      {viewer.id ? "Try Calm Premium" : "Included with Calm Premium"}
    </Link>
  );
}

function AccountMenu({ viewer, personas, demoAuth }: { viewer: PublicViewer; personas: readonly Persona[]; demoAuth: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function switchTo(userId: string | null) {
    setBusy(true);
    await fetch("/api/auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId }) });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-2 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender" aria-label="Account menu">
        <Avatar name={viewer.displayName ?? "Guest"} hue={viewer.avatarHue} size={36} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-night-2/95 p-2 shadow-card backdrop-blur-xl">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-white">{viewer.displayName ?? "Visitor"}</p>
            <p className="text-xs text-mist">{viewer.id ? (viewer.isPremium ? "Calm Premium (mock entitlement)" : "Free account") : "Not signed in"}</p>
          </div>
          <div className="my-1 border-t border-white/10" />
          {viewer.username && (
            <MenuLink href={viewer.isCreator ? `/profile/${viewer.username}` : "/library"} onClick={() => setOpen(false)}>
              {viewer.isCreator ? "My public profile" : "My library"}
            </MenuLink>
          )}
          {viewer.isCreator && (
            <MenuLink href="/studio" onClick={() => setOpen(false)}>
              Creator Studio
            </MenuLink>
          )}
          {viewer.isAdmin && (
            <MenuLink href="/admin" onClick={() => setOpen(false)}>
              Calm Production Studio
            </MenuLink>
          )}
          {viewer.id && (
            <MenuLink href="/settings" onClick={() => setOpen(false)}>
              Settings
            </MenuLink>
          )}
          {demoAuth && (
            <>
              <div className="my-1 border-t border-white/10" />
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-mist">Prototype sign-in</p>
              {personas.map((p) => (
                <button key={p.userId} role="menuitem" type="button" disabled={busy} onClick={() => switchTo(p.userId)} className={cx("block w-full rounded-xl px-3 py-2 text-left hover:bg-white/10", viewer.id === p.userId && "bg-white/10")}>
                  <span className="block text-sm text-white">{p.label}</span>
                  <span className="block text-xs text-mist">{p.description}</span>
                </button>
              ))}
              {viewer.id && (
                <button role="menuitem" type="button" disabled={busy} onClick={() => switchTo(null)} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-mist hover:bg-white/10 hover:text-white">
                  Sign out (browse as visitor)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link role="menuitem" href={href} onClick={onClick} className="block rounded-xl px-3 py-2 text-sm text-white/90 hover:bg-white/10">
      {children}
    </Link>
  );
}
