"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn } from "@/components/ui/styles";
import type { OpportunityWeights } from "@/lib/db/types";
import { post } from "@/lib/view/client-api";

export function WeightsForm({ initial, labels }: { initial: OpportunityWeights; labels: Record<keyof OpportunityWeights, string> }) {
  const [w, setW] = useState(initial);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(w) as (keyof OpportunityWeights)[]).map((k) => (
          <label key={k} className="text-sm">
            <span className="flex justify-between"><span>{labels[k]}</span><span className="tabular-nums text-bone-3">{total ? Math.round((w[k] / total) * 100) : 0}%</span></span>
            <input type="range" min={0} max={100} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} className="w-full accent-[#ff6a3d]" />
          </label>
        ))}
      </div>
      <button className={`${btn("primary", "sm")} mt-3`} onClick={async () => { await post("/api/studio/weights", w); setSaved(true); router.refresh(); }}>Save weights</button>
      {saved && <span className="ml-3 text-[12px] text-uncommon">Saved</span>}
    </div>
  );
}
