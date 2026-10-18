"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring } from "motion/react";
import { Download, Heart, Maximize2, RotateCcw, Share2, Sparkles, X } from "lucide-react";
import { Art } from "@/components/art/Art";
import { CardBack } from "@/components/cards/CardBack";
import { TradingCard } from "@/components/cards/TradingCard";
import { useViewer } from "@/components/shell/Viewer";
import { DustIcon } from "@/components/ui/Currency";
import { btn } from "@/components/ui/styles";
import type { Variant } from "@/lib/content/types";
import { VARIANT_META } from "@/lib/economy/config";
import type { CardFace } from "@/lib/view/face";
import { ApiError, post, track } from "@/lib/view/client-api";

export function CardInspector({
  face,
  owned,
  ownedVariants,
  favourite: fav0,
  craftCost,
  canCraft,
}: {
  face: CardFace;
  owned: boolean;
  ownedVariants: Variant[];
  favourite: boolean;
  craftCost: number;
  canCraft: boolean;
}) {
  const { viewer, setWallet } = useViewer();
  const router = useRouter();
  const variants = (["standard", "holographic", "full-art", "alt-art", "first-edition", "animated", "secret"] as Variant[]);
  const [variant, setVariant] = useState<Variant>(ownedVariants.find((v) => v !== "standard") ?? "standard");
  const [fav, setFav] = useState(fav0);
  const [zoom, setZoom] = useState(false);
  const [msg, setMsg] = useState<string>();
  const ry = useMotionValue(0);
  const rx = useMotionValue(0);
  const sry = useSpring(ry, { stiffness: 120, damping: 18 });
  const srx = useSpring(rx, { stiffness: 120, damping: 18 });
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; base: number } | null>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const card = el.querySelector<HTMLElement>(".tcard");
    card?.style.setProperty("--mx", `${x * 100}%`);
    card?.style.setProperty("--my", `${y * 100}%`);
    if (drag.current) ry.set(drag.current.base + (e.clientX - drag.current.x) * 0.6);
    else if (Math.abs(((ry.get() % 360) + 360) % 360) < 1) {
      rx.set((0.5 - y) * 14);
      ry.set((x - 0.5) * 16);
    }
  };

  const share = async () => {
    const url = `${location.origin}/cards/${face.id}`;
    track("card_shared", face.universe.id, { cardId: face.id });
    try {
      if (navigator.share) await navigator.share({ title: `${face.name} — ${face.universe.title}`, text: `I found ${face.name} on NEXARA`, url });
      else {
        await navigator.clipboard.writeText(url);
        setMsg("Link copied");
      }
    } catch {
      /* cancelled */
    }
  };

  const craft = async () => {
    try {
      const r = await post<{ wallet: typeof viewer.wallet }>("/api/cards/craft", { cardId: face.id });
      setWallet(r.wallet);
      setMsg("Crafted! It's in your collection.");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Couldn't craft that card");
    }
  };

  return (
    <div>
      <div
        ref={box}
        className="nx-animate relative mx-auto w-[min(78vw,400px)] touch-pan-y select-none [perspective:1400px]"
        onPointerMove={onMove}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, base: ry.get() };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerUp={() => {
          drag.current = null;
          const snapped = Math.round(ry.get() / 180) * 180;
          ry.set(snapped);
          rx.set(0);
        }}
        onPointerLeave={() => {
          if (!drag.current && Math.abs(ry.get()) < 30) {
            ry.set(0);
            rx.set(0);
          }
        }}
      >
        <motion.div style={{ rotateY: sry, rotateX: srx }} className="relative [transform-style:preserve-3d]">
          <div className="[backface-visibility:hidden]">
            <TradingCard face={face} variant={variant} animate className="[&_.tcard-glow]:opacity-100" />
          </div>
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <CardBack palette={face.universe.palette} title={face.universe.title} font={face.universe.font} />
          </div>
        </motion.div>
      </div>
      <p className="mt-4 text-center text-[12px] text-bone-4">Drag to turn the card · move to catch the light</p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button className={btn("glass", "sm")} onClick={() => { ry.set(ry.get() + 180); }}><RotateCcw size={15} /> Flip</button>
        <button className={btn("glass", "sm")} onClick={() => setZoom(true)}><Maximize2 size={15} /> Zoom art</button>
        <button
          className={btn(fav ? "light" : "glass", "sm")}
          aria-pressed={fav}
          onClick={async () => {
            setFav(!fav);
            try {
              const r = await post<{ favourite: boolean }>("/api/cards/favourite", { cardId: face.id });
              setFav(r.favourite);
            } catch {
              setFav(fav);
            }
          }}
        >
          <Heart size={15} fill={fav ? "currentColor" : "none"} /> {fav ? "Favourited" : "Favourite"}
        </button>
        <button className={btn("glass", "sm")} onClick={share}><Share2 size={15} /> Share</button>
        <a className={btn("glass", "sm")} href={`/api/cards/${face.id}/image`} download={`${face.id}.svg`}><Download size={15} /> Image</a>
      </div>
      {!owned && (
        <div className="mx-auto mt-5 max-w-md rounded-2xl border border-white/10 bg-ink-2 p-4 text-center text-sm">
          <p className="text-bone-2">You haven't discovered this card yet. Open {face.universe.title} packs — or craft it with Stardust from duplicates.</p>
          <button className={`${btn("primary", "sm")} mt-3`} disabled={!canCraft} onClick={craft}>
            <Sparkles size={15} /> Craft for <DustIcon /> {craftCost}
          </button>
          {!canCraft && <p className="mt-2 text-[12px] text-bone-4">You have {viewer.wallet.stardust} Stardust.</p>}
        </div>
      )}
      {msg && <p className="mt-3 text-center text-sm text-bone-2" role="status">{msg}</p>}

      <div className="mt-8">
        <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-bone-3">Variants</p>
        <div className="no-scrollbar flex justify-start gap-2 overflow-x-auto px-1 sm:justify-center">
          {variants.map((v) => (
            <button key={v} onClick={() => setVariant(v)} aria-pressed={variant === v} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${variant === v ? "border-bone bg-bone text-ink" : "border-white/10 text-bone-2 hover:border-white/30"}`}>
              {VARIANT_META[v].label}
              {ownedVariants.includes(v) ? <span className="ml-1.5 text-uncommon">●</span> : null}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[12px] text-bone-4">{VARIANT_META[variant].blurb} {ownedVariants.includes(variant) ? "You own this printing." : "Preview — not in your collection."}</p>
      </div>

      {zoom && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-4 backdrop-blur" role="dialog" aria-label="Artwork zoom" onClick={() => setZoom(false)}>
          <button className="glass absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full" aria-label="Close zoom"><X size={18} /></button>
          <ZoomArt face={face} variant={variant} />
        </div>
      )}
    </div>
  );
}

function ZoomArt({ face, variant }: { face: CardFace; variant: Variant }) {
  const [origin, setOrigin] = useState("50% 50%");
  const [scale, setScale] = useState(1.6);
  return (
    <div
      className="nx-animate relative aspect-[4/5] w-[min(92vw,70vh)] overflow-hidden rounded-3xl"
      onClick={(e) => e.stopPropagation()}
      onPointerMove={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
      }}
      onWheel={(e) => setScale((s) => Math.min(4, Math.max(1, s - e.deltaY * 0.002)))}
    >
      <div className="h-full w-full transition-transform duration-150" style={{ transform: `scale(${scale})`, transformOrigin: origin }}>
        {face.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={face.imageUrl} alt={face.name} className="h-full w-full object-cover" />
        ) : (
          <Art style={face.universe.style} palette={face.universe.palette} seed={variant === "alt-art" ? face.artSeed ^ 0x5bd1e995 : face.artSeed} kind={face.kind} title={face.name} className="h-full w-full" />
        )}
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {[1, 2, 3].map((s) => (
          <button key={s} onClick={() => setScale(s)} className={`rounded-full px-3 py-1 text-[12px] font-bold ${scale === s ? "bg-bone text-ink" : "bg-black/60 text-bone"}`}>{s}×</button>
        ))}
      </div>
    </div>
  );
}
