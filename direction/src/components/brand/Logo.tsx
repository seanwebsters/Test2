import { cn } from "@/lib/cn";

/** Wordmark: a compass-needle "D" plus DIRECTION set in the display face. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="#0EAA9C" />
      <path d="M16 5 L20 16 L16 27 L12 16 Z" fill="#FFFFFF" />
      <path d="M16 16 L20 16 L16 27 L12 16 Z" fill="#FF7A68" />
      <circle cx="16" cy="16" r="2" fill="#0E1B3D" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {!compact && <span className="font-display text-lg font-extrabold tracking-[0.08em] text-ink">DIRECTION</span>}
    </span>
  );
}
