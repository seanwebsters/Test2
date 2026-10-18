export type BtnKind = "primary" | "light" | "glass" | "ghost" | "danger";

const base =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";
const kinds: Record<BtnKind, string> = {
  primary: "bg-gradient-to-br from-ember-3 via-ember-2 to-ember text-ink shadow-[0_12px_30px_-12px_rgba(255,106,61,.9)] hover:brightness-110",
  light: "bg-bone text-ink hover:bg-white",
  glass: "glass text-bone hover:bg-white/10",
  ghost: "text-bone-2 hover:text-bone hover:bg-white/5",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
};
const sizes = { sm: "h-9 px-4 text-[13px]", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-[15px] py-3.5" } as const;

export function btn(kind: BtnKind = "primary", size: keyof typeof sizes = "md", extra = "") {
  return `${base} ${kinds[kind]} ${sizes[size]} ${extra}`;
}

export const chip = "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11.5px] font-semibold text-bone-2";
export const eyebrow = "text-[11px] font-bold uppercase tracking-[0.2em] text-bone-3";
export const container = "mx-auto w-full max-w-[1500px] px-4 md:px-8";
