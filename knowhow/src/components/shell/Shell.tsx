"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppState";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { FullPlayer } from "@/components/player/FullPlayer";
import { BottomNav, Sidebar } from "./Nav";
import { Celebration, GateSheet, Toasts } from "./Overlays";
import { cn } from "@/lib/cn";
import { registerOffline } from "@/components/player/offline";

const BARE = ["/onboarding", "/wrapped"];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useApp();
  const bare = BARE.some((p) => pathname.startsWith(p));

  useEffect(() => registerOffline(), []);

  // First-time listeners start with onboarding (it's skippable).
  useEffect(() => {
    if (state && !state.onboarded && !bare && !pathname.startsWith("/u/") && !pathname.startsWith("/sign-in")) router.replace("/onboarding");
  }, [state, bare, pathname, router]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-lime focus:px-4 focus:py-2 focus:text-ink">Skip to content</a>
      {!bare && <Sidebar />}
      <main id="main" className={cn(!bare && "md:pl-[84px] xl:pl-[248px]")}>{children}</main>
      {!bare && <BottomNav />}
      <MiniPlayer />
      <FullPlayer />
      <GateSheet />
      <Celebration />
      <Toasts />
    </>
  );
}
