import type { Palette } from "@/lib/content/types";

/** The reverse of every NEXARA card, tinted by universe. */
export function CardBack({ palette, title, font }: { palette: Palette; title?: string; font?: string }) {
  return (
    <div className="tcard r-common" style={{ ["--frame" as string]: `linear-gradient(160deg, ${palette.accent}, ${palette.accent2})` }}>
      <div className="tcard-inner grid place-items-center" style={{ background: `radial-gradient(circle at 50% 40%, ${palette.surface}, ${palette.bg} 70%)` }}>
        <svg viewBox="0 0 100 140" className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
          <defs>
            <pattern id="cbp" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="10" fill={palette.accent} opacity=".12" />
            </pattern>
          </defs>
          <rect width="100" height="140" fill="url(#cbp)" />
          {[18, 26, 34].map((r) => (
            <circle key={r} cx="50" cy="70" r={r} fill="none" stroke={palette.accent} strokeOpacity=".35" strokeWidth=".6" />
          ))}
        </svg>
        <div className="relative flex flex-col items-center gap-[3cqw]">
          <span className="font-brand text-[8cqw] font-semibold tracking-[0.3em]" style={{ color: palette.ink }}>NEXARA</span>
          {title && <span className={`ff-${font} text-[5.5cqw]`} style={{ color: palette.accent }}>{title}</span>}
        </div>
      </div>
      <div className="tcard-frame" />
    </div>
  );
}
