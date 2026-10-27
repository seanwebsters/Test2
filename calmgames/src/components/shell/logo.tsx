export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="lm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9AEDC" />
          <stop offset="0.55" stopColor="#E9B79A" />
          <stop offset="1" stopColor="#7FA6C4" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#lm-sky)" />
      <circle cx="26" cy="17" r="5.5" fill="#FBF9F5" opacity="0.92" />
      <path d="M6 28c4.5 0 4.5-3 9-3s4.5 3 9 3 4.5-3 9-3 3 1.5 3 1.5V40H6Z" fill="#14213D" opacity="0.85" />
    </svg>
  );
}
