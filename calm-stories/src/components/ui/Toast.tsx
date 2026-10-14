"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cx } from "@/lib/util";

type Toast = { id: number; text: string; tone: "info" | "error" };
const Ctx = createContext<((text: string, tone?: Toast["tone"]) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-[calc(var(--player-h)+1rem)] right-4 z-[70] flex max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={cx("pointer-events-auto rounded-2xl px-4 py-3 text-sm shadow-xl animate-fade-up", t.tone === "error" ? "bg-rose-500/95 text-white" : "bg-white text-night")}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast outside ToastProvider");
  return c;
}
