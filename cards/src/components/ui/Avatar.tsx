export function Avatar({ seed, name, size = 36, className = "" }: { seed: number; name: string; size?: number; className?: string }) {
  const h = seed % 360;
  const initials = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-brand font-semibold text-ink ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `conic-gradient(from ${h}deg, hsl(${h} 80% 72%), hsl(${(h + 60) % 360} 85% 62%), hsl(${(h + 140) % 360} 70% 70%), hsl(${h} 80% 72%))` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
