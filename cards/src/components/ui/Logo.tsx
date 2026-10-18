export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="nxlg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb48a" />
          <stop offset="1" stopColor="#ff6a3d" />
        </linearGradient>
      </defs>
      <rect x="3" y="7" width="14" height="20" rx="2.5" fill="#f4efe6" opacity=".25" transform="rotate(-14 10 17)" />
      <rect x="9" y="5" width="14" height="20" rx="2.5" fill="#f4efe6" opacity=".55" transform="rotate(-2 16 15)" />
      <rect x="15" y="4" width="14" height="20" rx="2.5" fill="url(#nxlg)" transform="rotate(10 22 14)" />
      <circle cx="22" cy="12" r="2.4" fill="#09090d" transform="rotate(10 22 14)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-brand text-[15px] font-semibold tracking-[0.32em] ${className}`}>NEXARA</span>;
}
