export function ShardIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 2l7 6l-7 14l-7-14Z" fill="#3fd0c9" />
      <path d="M12 2l7 6h-14Z" fill="#a8fff8" />
      <path d="M12 2v20" stroke="#0a3b39" strokeOpacity=".35" />
    </svg>
  );
}
export function DustIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="8" cy="9" r="3.2" fill="#ffd36b" />
      <circle cx="16" cy="7" r="2" fill="#ffe9a8" />
      <circle cx="15" cy="15" r="3.8" fill="#ffc247" />
      <circle cx="7" cy="17" r="1.6" fill="#ffe9a8" />
    </svg>
  );
}
export const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1000)}K` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));
