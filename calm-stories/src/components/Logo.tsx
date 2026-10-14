import Link from "next/link";

/** Calm Stories wordmark: Calm's script-style lowercase "calm" in serif italic plus a quiet "Stories" label. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-baseline gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender" aria-label="Calm Stories home">
      <span className="font-serif text-[1.9rem] font-semibold italic leading-none tracking-tight text-white">calm</span>
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.3em] text-mist transition group-hover:text-lavender">Stories</span>
    </Link>
  );
}
