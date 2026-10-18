import Link from "next/link";
import type { Variant } from "@/lib/content/types";
import type { CardFace } from "@/lib/view/face";
import { Tilt } from "./Tilt";
import { TradingCard } from "./TradingCard";

export function CardThumb({
  face,
  variant,
  locked,
  count,
  isNew,
  caption,
  className = "w-[42vw] sm:w-[190px]",
  href,
}: {
  face: CardFace;
  variant?: Variant;
  locked?: boolean;
  count?: number;
  isNew?: boolean;
  caption?: React.ReactNode;
  className?: string;
  href?: string;
}) {
  return (
    <div className={`shrink-0 snap-start ${className}`}>
      <Link href={href ?? `/cards/${face.id}`} className="focus-ring block rounded-[6%]" aria-label={locked ? "Undiscovered card" : face.name}>
        <Tilt>
          <TradingCard
            face={face}
            variant={variant}
            locked={locked}
            badge={
              <>
                {isNew && <span className="absolute left-[6%] top-[5%] z-[6] rounded-full bg-ember px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">New</span>}
                {count && count > 1 ? <span className="absolute right-[6%] top-[5%] z-[6] rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">×{count}</span> : null}
              </>
            }
          />
        </Tilt>
      </Link>
      {caption && <div className="mt-2 px-1 text-[12px] text-bone-3">{caption}</div>}
    </div>
  );
}
