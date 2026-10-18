import { Art } from "@/components/art/Art";
import type { Variant } from "@/lib/content/types";
import { RARITY_META, VARIANT_META } from "@/lib/economy/config";
import type { CardFace } from "@/lib/view/face";
import { RarityGem } from "./RarityGem";

export interface TradingCardProps {
  face: CardFace;
  variant?: Variant;
  /** Locked cards show an obscured silhouette */
  locked?: boolean;
  /** Animate the art layers */
  animate?: boolean;
  className?: string;
  /** Hide the text panel (thumbnails) */
  compact?: boolean;
  badge?: React.ReactNode;
}

const KIND_LABEL: Record<CardFace["kind"], string> = {
  character: "Character",
  creature: "Creature",
  location: "Location",
  object: "Object",
  event: "Event",
  artifact: "Artifact",
  moment: "Legendary Moment",
  secret: "Hidden Secret",
};

/**
 * The NEXARA trading card. Rarity drives the frame; cosmetic variants are
 * layered independently (foil, full art, alt art, stamps, motion).
 */
export function TradingCard({ face, variant = "standard", locked, animate, className = "", compact, badge }: TradingCardProps) {
  const pal = face.universe.palette;
  const full = variant === "full-art" || variant === "secret";
  const foil = !locked && (variant === "holographic" || variant === "secret" || face.rarity === "mythic" || variant === "full-art");
  const anim = !locked && (animate || variant === "animated" || face.rarity === "mythic");
  const meta = RARITY_META[face.rarity];
  const label = locked ? "Undiscovered card" : `${face.name}, ${meta.label}${variant !== "standard" ? `, ${VARIANT_META[variant].label}` : ""}`;
  return (
    <div
      className={`tcard r-${face.rarity} v-${variant} ${locked ? "tcard-locked" : ""} ${anim ? "nx-animate" : ""} ${className}`}
      style={{ ["--alt-hue" as string]: `${(face.artSeed % 160) + 100}deg` }}
      role="img"
      aria-label={label}
    >
      <div className="tcard-glow" />
      <div className="tcard-inner" style={{ background: pal.bg }}>
        <div className={`tcard-art absolute overflow-hidden ${full ? "inset-0" : "left-[5.5%] right-[5.5%] top-[4.5%] h-[60%] rounded-[3cqw]"}`}>
          {face.imageUrl && !locked ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={face.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Art style={face.universe.style} palette={pal} seed={variant === "alt-art" ? face.artSeed ^ 0x5bd1e995 : face.artSeed} kind={face.kind} aspect={full ? "tall" : "card"} className="h-full w-full" />
          )}
          {!full && <div className="pointer-events-none absolute inset-0 rounded-[3cqw] ring-1 ring-inset ring-white/10" />}
        </div>

        {full && <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/95 via-black/60 to-transparent" />}

        {locked && (
          <div className="absolute inset-0 z-[2] grid place-items-center">
            <div className="flex flex-col items-center gap-[2cqw] text-center">
              <span className="text-[16cqw] font-light leading-none text-white/25">?</span>
              <span className="text-[4cqw] font-semibold uppercase tracking-[0.25em] text-white/40">Undiscovered</span>
            </div>
          </div>
        )}

        {!compact && (
          <div className={`absolute inset-x-[5.5%] z-[2] ${full ? "bottom-[4.5%]" : "bottom-[4%] top-[66%]"} flex flex-col`}>
            <div className="flex items-start justify-between gap-[2cqw]">
              <h3 className={`ff-${face.universe.font} min-w-0 text-[7.4cqw] leading-[1.05]`} style={{ color: pal.ink }}>
                {locked ? "???" : face.name}
              </h3>
              <RarityGem rarity={face.rarity} size={18} className="mt-[0.5cqw] h-[6cqw] w-[6cqw] shrink-0" />
            </div>
            <div className="mt-[1.4cqw] flex items-center gap-[1.6cqw] text-[3.4cqw] font-semibold uppercase tracking-[0.12em]" style={{ color: `${pal.ink}99` }}>
              <span>{KIND_LABEL[face.kind]}</span>
              {face.factionName && !locked && (
                <>
                  <span className="h-[1cqw] w-[1cqw] rounded-full" style={{ background: face.factionColor }} />
                  <span className="truncate">{face.factionName}</span>
                </>
              )}
            </div>
            {!full && (
              <p className="mt-[1.8cqw] line-clamp-2 text-[4cqw] leading-[1.3]" style={{ color: `${pal.ink}cc` }}>
                {locked ? "Open packs or read the story to discover this card." : face.description}
              </p>
            )}
            <div className="mt-auto flex items-end justify-between pt-[1.5cqw] text-[3.1cqw] font-semibold tracking-[0.1em]" style={{ color: `${pal.ink}80` }}>
              <span>
                {face.setCode} {String(face.number).padStart(3, "0")}/{String(face.setSize).padStart(3, "0")}
              </span>
              <span style={{ color: meta.color }}>{meta.label.toUpperCase()}</span>
            </div>
          </div>
        )}

        {variant === "first-edition" && !locked && (
          <div className="absolute left-[8%] top-[7%] z-[4] rounded-full border border-black/40 bg-[#f4efe6] px-[2cqw] py-[0.6cqw] text-[3cqw] font-black uppercase tracking-[0.1em] text-black shadow">1st Edition</div>
        )}
        {variant === "secret" && !locked && (
          <div className="absolute right-[7%] top-[6%] z-[4] text-[3.4cqw] font-black uppercase tracking-[0.35em] text-[#ffe08a] drop-shadow">Secret</div>
        )}
        {foil && (
          <>
            <div className="holo" />
            <div className="holo-sparkle" />
          </>
        )}
        <div className="tcard-sheen" />
        {badge}
      </div>
      <div className="tcard-frame" />
    </div>
  );
}
