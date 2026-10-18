"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Wallet } from "@/lib/db/types";

export interface ViewerInfo {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: number;
  role: "user" | "admin";
  isGuest: boolean;
  settings: { sound: boolean; haptics: boolean; reducedMotion: boolean };
  wallet: Wallet;
  unread: number;
  hasPass: boolean;
}

interface Ctx {
  viewer: ViewerInfo;
  setWallet: (w: Wallet) => void;
  setUnread: (n: number) => void;
  setSettings: (s: Partial<ViewerInfo["settings"]>) => void;
}

const ViewerContext = createContext<Ctx | null>(null);

export function ViewerProvider({ initial, children }: { initial: ViewerInfo; children: ReactNode }) {
  const [viewer, setViewer] = useState(initial);
  useEffect(() => setViewer(initial), [initial]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(viewer.settings.reducedMotion);
  }, [viewer.settings.reducedMotion]);
  const setWallet = useCallback((wallet: Wallet) => setViewer((v) => ({ ...v, wallet })), []);
  const setUnread = useCallback((unread: number) => setViewer((v) => ({ ...v, unread })), []);
  const setSettings = useCallback((s: Partial<ViewerInfo["settings"]>) => setViewer((v) => ({ ...v, settings: { ...v.settings, ...s } })), []);
  return <ViewerContext.Provider value={{ viewer, setWallet, setUnread, setSettings }}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  const c = useContext(ViewerContext);
  if (!c) throw new Error("useViewer outside ViewerProvider");
  return c;
}

export function prefersReducedMotion(viewer?: ViewerInfo) {
  if (typeof window === "undefined") return false;
  return !!viewer?.settings.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;
}
