"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/util";

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/agents", "Agents & jobs"],
  ["/admin/review", "Editorial review"],
  ["/admin/calendar", "Publishing calendar"],
  ["/admin/moderation", "Moderation"],
  ["/admin/settings", "AI settings"],
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-white/10 pb-3">
      {LINKS.map(([href, label]) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cx("shrink-0 rounded-full px-4 py-2 text-sm", active ? "bg-white/10 text-white" : "text-mist hover:text-white")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
