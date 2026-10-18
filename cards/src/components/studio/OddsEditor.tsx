"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn } from "@/components/ui/styles";
import { RARITIES, VARIANTS } from "@/lib/content/types";
import type { EconomyConfig } from "@/lib/economy/config";
import { ApiError, post } from "@/lib/view/client-api";

type Tables = Pick<EconomyConfig, "standardSlot" | "rarePlusSlot" | "variants">;

export function OddsEditor({ initial }: { initial: Tables }) {
  const [t, setT] = useState<Tables>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const router = useRouter();
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  const Col = ({ k, keys, title }: { k: keyof Tables; keys: readonly string[]; title: string }) => {
    const total = sum(t[k] as Record<string, number>);
    return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bone-3">{title}</p>
        {keys.map((r) => (
          <label key={r} className="mt-2 flex items-center justify-between gap-2 text-sm">
            <span>{r}</span>
            <input type="number" min={0} max={10000} value={(t[k] as Record<string, number>)[r]} onChange={(e) => setT({ ...t, [k]: { ...t[k], [r]: Math.max(0, Math.round(Number(e.target.value))) } })} className="w-24 rounded-lg border border-white/10 bg-ink-3 px-2 py-1 text-right tabular-nums" />
          </label>
        ))}
        <p className={`mt-2 text-right text-[12px] tabular-nums ${total === 10000 ? "text-uncommon" : "text-red-300"}`}>Σ {total} / 10000</p>
      </div>
    );
  };
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-3">
        <Col k="standardSlot" keys={RARITIES} title="Standard slot (bp)" />
        <Col k="rarePlusSlot" keys={RARITIES} title="Guaranteed Rare+ slot (bp)" />
        <Col k="variants" keys={VARIANTS} title="Cosmetic variants (bp)" />
      </div>
      <button
        className={`${btn("primary", "sm")} mt-4`}
        onClick={async () => {
          if (!window.confirm("Publish new odds? They apply to every pack opened from now on and the public odds page updates immediately.")) return;
          try {
            await post("/api/studio/economy", t);
            setMsg({ ok: true, text: "Odds updated and audited" });
            router.refresh();
          } catch (e) {
            setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Failed" });
          }
        }}
      >
        Publish odds
      </button>
      {msg && <span className={`ml-3 text-[12px] ${msg.ok ? "text-uncommon" : "text-red-300"}`}>{msg.text}</span>}
    </div>
  );
}
