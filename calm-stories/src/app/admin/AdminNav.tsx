"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/util";

const ITEMS = [
  { href: "/studio", label: "← Studio" },
  { href: "/admin/episodes/new", label: "Add episode" },
  { href: "/admin/review", label: "Review queue" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/moderation", label: "Moderation" },
];

export function AdminNav() {
  const p = usePathname() ?? "";
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {ITEMS.map((i) => {
        const active = i.href === "/admin" ? p === "/admin" : p.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={cx("rounded-full px-3.5 py-1.5 text-sm", active ? "bg-white text-night" : "text-mist hover:text-white")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
