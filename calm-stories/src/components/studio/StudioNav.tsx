"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/util";

const NAV: { href: string; label: string; icon: string }[] = [
  { href: "/office", label: "AI Team", icon: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5" },
  { href: "/studio", label: "Studio Overview", icon: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/studio/now", label: "Now", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2" },
  { href: "/studio/series", label: "Series", icon: "M4 5h16v14H4zM4 9h16M9 5v14" },
  { href: "/studio/writers-room", label: "Writers' Room", icon: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4" },
  { href: "/studio/art", label: "Art Studio", icon: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1.5 1.5 0 1 0 0-.01" },
  { href: "/studio/audio", label: "Audio Studio", icon: "M4 18V6m4 12V9m4 9V4m4 14V8m4 10v-6" },
  { href: "/studio/pipeline", label: "Production Pipeline", icon: "M4 6h6v4H4zM14 14h6v4h-6zM10 8h4v8h0M14 8h6v4h-6z" },
  { href: "/studio/approvals", label: "Approvals", icon: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM8.5 12l2.5 2.5 4.5-5" },
  { href: "/studio/releases", label: "Releases", icon: "M5 4h14v16H5zM8 2v4M16 2v4M5 9h14M9 13l2 2 4-4" },
  { href: "/studio/analytics", label: "Analytics", icon: "M4 20V10m6 10V4m6 16v-7m4 7H2" },
  { href: "/studio/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" },
];

export function StudioNav({ approvals }: { approvals: number }) {
  const p = usePathname() ?? "";
  return (
    <nav aria-label="Studio" className="space-y-1">
      {NAV.map((n) => {
        const active = n.href === "/studio" ? p === "/studio" : p.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition", active ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(169,155,244,0.25)]" : "text-mist hover:bg-white/[0.04] hover:text-white")}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={n.icon} />
            </svg>
            <span className="font-serif text-[16px] tracking-wide">{n.label}</span>
            {n.href === "/studio/approvals" && approvals > 0 && <span className="ml-auto rounded-full bg-amber-300/90 px-2 text-[11px] font-semibold text-night">{approvals}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
