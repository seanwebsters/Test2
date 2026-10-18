"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavLink({ href, children, variant }: { href: string; children: React.ReactNode; variant: "side" | "bottom" }) {
  const path = usePathname();
  const active = path === href || path.startsWith(`${href}/`);
  if (variant === "side") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "focus-ring flex items-center gap-3 rounded-2xl px-3 py-2.5 font-display font-bold text-ink-2 transition hover:bg-surface-2",
          active && "bg-teal-soft text-teal-deep dark:text-teal",
        )}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("focus-ring flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-ink-3 transition", active && "text-teal")}
    >
      {children}
    </Link>
  );
}
