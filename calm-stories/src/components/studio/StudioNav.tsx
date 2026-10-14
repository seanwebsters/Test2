"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/util";

const LINKS = [
  ["/studio", "My series"],
  ["/studio/production", "AI usage"],
  ["/notifications", "Notifications"],
  ["/create", "Open Storymaker"],
] as const;

export function StudioNav() {
  const path = usePathname();
  return (
    <nav aria-label="Creator Studio" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-white/10 pb-3">
      {LINKS.map(([href, label]) => {
        const active = href === "/studio" ? path === "/studio" || path.startsWith("/studio/series") : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cx("shrink-0 rounded-full px-4 py-2 text-sm", active ? "bg-white/10 text-white" : "text-mist hover:text-white")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
