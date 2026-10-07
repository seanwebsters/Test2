/** Wordmark placeholder for "Calm" — set in the display face, not the trademarked logo file. */
export function CalmMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center font-display text-2xl italic leading-none tracking-tight text-white ${className}`} style={{ fontVariationSettings: '"SOFT" 100, "opsz" 72' }}>
      Calm
    </span>
  );
}
