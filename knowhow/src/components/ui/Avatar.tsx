import { cn } from "@/lib/cn";

export function Avatar({ name, hue, className }: { name: string; hue: number; className?: string }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full font-display text-[0.8em] font-black text-ink", className)}
      style={{ background: `conic-gradient(from 200deg, hsl(${hue} 95% 72%), hsl(${(hue + 70) % 360} 95% 70%), hsl(${hue} 95% 72%))` }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
