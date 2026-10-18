"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import { btn } from "@/components/ui/styles";
import type { Variant } from "@/lib/content/types";
import type { CardFace } from "@/lib/view/face";
import { ApiError, post } from "@/lib/view/client-api";

export function ShowcaseEditor({ owned, initial }: { owned: { face: CardFace; variant: Variant }[]; initial: string[] }) {
  const [sel, setSel] = useState<string[]>(initial);
  const [msg, setMsg] = useState<string>();
  const router = useRouter();
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 9 ? s : [...s, id]));
  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-5 flex items-center justify-between gap-3 bg-ink/90 px-4 py-3 backdrop-blur">
        <p className="text-sm text-bone-2">{sel.length}/9 selected — pick the cards visitors see first on your profile.</p>
        <button
          className={btn("primary", "sm")}
          onClick={async () => {
            try {
              await post("/api/me/showcase", { cardIds: sel });
              setMsg("Showcase saved");
              router.refresh();
            } catch (e) {
              setMsg(e instanceof ApiError ? e.message : "Couldn't save");
            }
          }}
        >
          Save showcase
        </button>
      </div>
      {msg && <p className="mb-4 text-sm text-uncommon" role="status">{msg}</p>}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {owned.map(({ face, variant }) => {
          const on = sel.includes(face.id);
          return (
            <button key={face.id} onClick={() => toggle(face.id)} aria-pressed={on} className={`focus-ring relative rounded-[6%] transition ${on ? "ring-2 ring-ember ring-offset-2 ring-offset-ink" : "opacity-80 hover:opacity-100"}`}>
              <TradingCard face={face} variant={variant} compact />
              {on && <span className="absolute -right-1.5 -top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-ember text-ink"><Check size={14} /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
