export function Avatar({ name, hue, size = 40 }: { name: string; hue: number; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-medium text-white ring-1 ring-white/15"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 40) % 360} 60% 28%))` }}
    >
      {initials || "·"}
    </span>
  );
}
