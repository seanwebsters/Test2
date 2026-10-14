"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}

const Ctx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Accessible confirmation dialog for destructive, paid or publishing actions. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((res) => (resolver.current = res));
  }, []);
  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };
  useEffect(() => {
    if (opts) btn.current?.focus();
  }, [opts]);
  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" onKeyDown={(e) => e.key === "Escape" && close(false)}>
          <div className="card w-full max-w-md p-6 animate-fade-up">
            <h2 id="cd-title" className="headline text-2xl">{opts.title}</h2>
            {opts.body && <p className="mt-2 text-sm text-mist">{opts.body}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-ghost" onClick={() => close(false)}>Cancel</button>
              <button ref={btn} className={opts.danger ? "btn-danger" : "btn-primary"} onClick={() => close(true)}>
                {opts.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfirm outside ConfirmProvider");
  return c;
}
