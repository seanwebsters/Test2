"use client";

import { usePathname } from "next/navigation";

/** The listener header, footer and player are hidden inside the studio, which has its own chrome. */
export function ListenerChrome({ children }: { children: React.ReactNode }) {
  const p = usePathname() ?? "";
  if (p === "/studio" || p.startsWith("/studio/") || p === "/office" || p === "/studio-login") return null;
  return <>{children}</>;
}
