"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ViewerInfo } from "@/lib/viewer-info";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { cx } from "@/lib/util";

const NAV = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/discover", label: "Series", match: (p: string) => p.startsWith("/discover") || p.startsWith("/series") },
  { href: "/create", label: "Create", match: (p: string) => p.startsWith("/create") || p.startsWith("/studio") },
  { href: "/library", label: "My Library", match: (p: string) => p.startsWith("/library") },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cx("group flex items-baseline gap-2", className)} aria-label="Calm Stories home">
      <span className="font-serif text-[1.75rem] font-semibold italic leading-none tracking-tight text-white">Calm</span>
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-lavender">Stories</span>
    </Link>
  );
}

export function SiteHeader({ viewer, unread }: { viewer: ViewerInfo; unread: number }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <header
      className={cx(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled ? "border-b border-white/5 bg-night/85 backdrop-blur-xl" : "bg-gradient-to-b from-night/80 to-transparent",
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-night">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-8">
        <button className="text-white md:hidden" aria-label="Open menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((v) => !v)}>
          <Icon name={mobileOpen ? "close" : "menu"} />
        </button>
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.match(pathname) ? "page" : undefined}
              className={cx(
                "rounded-full px-3.5 py-1.5 text-sm transition",
                item.match(pathname) ? "bg-white/10 text-white" : "text-mist hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <form
            role="search"
            className="relative hidden lg:block"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/discover?q=${encodeURIComponent(q)}`);
            }}
          >
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input
              aria-label="Search Sleep Stories"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search stories, creators…"
              className="w-60 rounded-full border border-white/10 bg-white/5 py-1.5 pl-9 pr-3 text-sm placeholder:text-mist/70 focus:border-lavender/50 focus:outline-none"
            />
          </form>
          <Link href="/discover" className="rounded-full p-2 text-mist hover:text-white lg:hidden" aria-label="Search">
            <Icon name="search" />
          </Link>
          {viewer.signedIn ? (
            <>
              <span
                className={cx(
                  "hidden rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider sm:inline-flex",
                  viewer.premium ? "bg-lavender/15 text-lavender" : "bg-white/5 text-mist",
                )}
                title={viewer.premium ? "Calm Premium (mock entitlement)" : "Free account"}
              >
                {viewer.premium ? "Premium" : "Free"}
              </span>
              <Link href="/library#updates" className="relative rounded-full p-2 text-mist hover:text-white" aria-label={`Updates${unread ? `, ${unread} unread` : ""}`}>
                <Icon name="bell" />
                {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-lavender" />}
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-white/5"
                >
                  <Avatar name={viewer.displayName ?? "?"} hue={viewer.hue} size={32} />
                  <Icon name="chevronDown" size={14} className="text-mist" />
                </button>
                {menuOpen && (
                  <div role="menu" className="card absolute right-0 mt-2 w-64 overflow-hidden p-2 text-sm animate-fade-up">
                    <div className="px-3 py-2">
                      <div className="font-medium">{viewer.displayName}</div>
                      <div className="text-xs text-mist">@{viewer.username} · {viewer.tier}</div>
                    </div>
                    <div className="my-1 h-px bg-white/10" />
                    {viewer.username && <MenuLink href={`/profile/${viewer.username}`}>Public profile</MenuLink>}
                    <MenuLink href="/library">My Library</MenuLink>
                    {viewer.creator && <MenuLink href="/studio">Creator Studio</MenuLink>}
                    {viewer.creator && <MenuLink href="/create">Calm Storymaker</MenuLink>}
                    {viewer.admin && <MenuLink href="/admin">Calm Production Studio</MenuLink>}
                    <MenuLink href="/settings">Settings</MenuLink>
                    <MenuLink href="/sign-in">Switch demo account</MenuLink>
                    <button role="menuitem" onClick={signOut} className="w-full rounded-xl px-3 py-2 text-left text-mist hover:bg-white/5 hover:text-white">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/sign-in" className="btn-primary btn-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
      {mobileOpen && (
        <nav aria-label="Mobile" className="border-t border-white/5 bg-night/95 px-4 py-3 backdrop-blur md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx("block rounded-xl px-3 py-2.5", item.match(pathname) ? "bg-white/10 text-white" : "text-mist")}
            >
              {item.label}
            </Link>
          ))}
          {viewer.admin && (
            <Link href="/admin" className="block rounded-xl px-3 py-2.5 text-mist">
              Production Studio
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link role="menuitem" href={href} className="block rounded-xl px-3 py-2 text-mist hover:bg-white/5 hover:text-white">
      {children}
    </Link>
  );
}
