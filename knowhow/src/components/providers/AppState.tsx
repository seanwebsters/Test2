"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ClientState } from "@/lib/client-state";
import type { GameEvent } from "@/lib/domain";
import { TZ_COOKIE } from "@/lib/session";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: "lime" | "lavender" | "coral" | "plain";
  icon?: string;
}

interface AppCtx {
  state: ClientState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  api: <T = unknown>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
  toast: (t: Omit<Toast, "id">) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  celebrations: GameEvent[];
  shiftCelebration: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [celebrations, setCelebrations] = useState<GameEvent[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 3800);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((all) => all.filter((x) => x.id !== id)), []);

  const handleEvents = useCallback(
    (events: GameEvent[]) => {
      for (const e of events) {
        if (e.type === "xp") toast({ title: `+${e.amount} XP`, body: e.reason, tone: "lime", icon: "zap" });
        if (e.type === "streak" && e.current > 1) toast({ title: `${e.current}-day streak`, body: "Your brain showed up again.", tone: "coral", icon: "flame" });
      }
      const big = events.filter((e) => e.type === "level" || e.type === "card");
      if (big.length) setCelebrations((c) => [...c, ...big]);
    },
    [toast],
  );

  const api = useCallback(
    async <T,>(path: string, init?: { method?: string; body?: unknown }): Promise<T> => {
      const res = await fetch(path, {
        method: init?.method ?? (init?.body ? "POST" : "GET"),
        headers: init?.body ? { "Content-Type": "application/json" } : undefined,
        body: init?.body ? JSON.stringify(init.body) : undefined,
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, json.error ?? "Something went wrong", json.code);
      if (json && typeof json === "object") {
        if ("state" in json && json.state) setState(json.state);
        if ("events" in json && Array.isArray(json.events)) handleEvents(json.events);
      }
      return json as T;
    },
    [handleEvents],
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) throw new Error("Couldn't load your profile");
      setState(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* ignore */
    }
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ state, loading, error, refresh, api, toast, toasts, dismissToast, celebrations, shiftCelebration: () => setCelebrations((c) => c.slice(1)) }),
    [state, loading, error, refresh, api, toast, toasts, dismissToast, celebrations],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
