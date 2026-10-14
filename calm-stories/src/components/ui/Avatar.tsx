export function Avatar({ name, hue, size = 36 }: { name: string; hue: number; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-white/20"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 55% 55%), hsl(${(hue + 50) % 360} 60% 38%))`,
      }}
    >
      {initials}
    </span>
  );
}
