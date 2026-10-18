"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { btn } from "@/components/ui/styles";
import { ApiError, post } from "@/lib/view/client-api";

export function StudioGate({ hint }: { hint?: string }) {
  const [u, setU] = useState("studio");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string>();
  const router = useRouter();
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <form
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-2 p-7"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const r = await post<{ role: string }>("/api/auth/signin", { username: u, password: p });
            if (r.role !== "admin") setErr("That account isn't a Studio administrator.");
            router.refresh();
          } catch (e2) {
            setErr(e2 instanceof ApiError ? e2.message : "Couldn't sign in");
          }
        }}
      >
        <Lock className="text-ember-2" />
        <h1 className="mt-3 text-2xl font-extrabold">NEXARA Studio</h1>
        <p className="mt-1 text-sm text-bone-3">Administrators only. Sign in with a Studio account.</p>
        <label className="mt-5 block text-[12px] font-semibold text-bone-2">Username<input className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" /></label>
        <label className="mt-3 block text-[12px] font-semibold text-bone-2">Password<input type="password" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></label>
        <button className={`${btn("primary")} mt-5 w-full`}>Sign in</button>
        {err && <p className="mt-3 text-sm text-red-300" role="alert">{err}</p>}
        {hint && <p className="mt-4 rounded-xl bg-white/[0.04] p-3 text-[12px] text-bone-3">{hint}</p>}
      </form>
    </div>
  );
}
