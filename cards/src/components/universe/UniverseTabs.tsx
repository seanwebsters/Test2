"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function UniverseTabs({ slug, accent }: { slug: string; accent: string }) {
  const path = usePathname();
  const tabs = [
    { href: `/universes/${slug}`, label: "Overview" },
    { href: `/universes/${slug}/cards`, label: "Cards" },
    { href: `/universes/${slug}/stories`, label: "Story" },
    { href: `/universes/${slug}/characters`, label: "Characters" },
    { href: `/universes/${slug}/lore`, label: "Lore" },
    { href: `/packs/standard?u=${slug}`, label: "Packs" },
    { href: `/collection/${slug}`, label: "Collection" },
  ];
  return (
    <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0" aria-label="Universe sections">
      {tabs.map((t) => {
        const on = path === t.href;
        return (
          <Link key={t.href} href={t.href} className="focus-ring relative shrink-0 rounded-full px-4 py-2 text-[13.5px] font-semibold transition" style={on ? { background: `${accent}26`, color: accent } : undefined} aria-current={on ? "page" : undefined}>
            <span className={on ? "" : "text-bone-2 hover:text-bone"}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
