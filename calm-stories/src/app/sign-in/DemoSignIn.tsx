"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cx } from "@/lib/util";

export interface Persona {
  id: string;
  name: string;
  hue: number;
  role: string;
  blurb: string;
}

export function DemoSignIn({ personas, currentId, next }: { personas: Persona[]; currentId: string | null; next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const choose = async (id: string) => {
    setBusy(id);
    setError(null);
    const res = await fetch("/api/auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user_id: id }) });
    if (!res.ok) {
      setError("Couldn't sign in. Please try again.");
      setBusy(null);
      return;
    }
    router.push(next.startsWith("/") ? next : "/");
    router.refresh();
  };
  return (
    <div className="mt-8 grid gap-3">
      {personas.map((p) => (
        <button
          key={p.id}
          onClick={() => choose(p.id)}
          disabled={busy !== null}
          className={cx("card flex items-center gap-4 p-4 text-left transition hover:border-lavender/40", currentId === p.id && "border-lavender/60")}
        >
          <Avatar name={p.name} hue={p.hue} size={48} />
          <div className="flex-1">
            <div className="font-medium">
              {p.name} <span className="ml-2 chip">{p.role}</span>
            </div>
            <div className="mt-1 text-sm text-mist">{p.blurb}</div>
          </div>
          <span className="text-sm text-lavender">{busy === p.id ? "Signing in…" : currentId === p.id ? "Current" : "Continue"}</span>
        </button>
      ))}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    </div>
  );
}
