import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 24, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...rest,
});

export const IconHome = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const IconStar = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
);
export const IconSpark = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M12 2 14.2 9.8 22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" /></svg>
);
export const IconCompass = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
);
export const IconUser = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
export const IconTrophy = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 21h8M9 17h6" /></svg>
);
export const IconClose = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconArrowRight = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconArrowLeft = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
export const IconCheck = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconLock = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
);
export const IconShare = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
);
export const IconPencil = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /></svg>
);
export const IconSend = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconRefresh = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
);
export const IconCopy = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
);
export const IconSettings = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
export const IconUpload = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
);
export const IconDownload = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></svg>
);
export const IconExternal = ({ size, ...r }: P) => (
  <svg {...base(size, r)}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
);

/** Filled flame used for streaks. */
export const Flame = ({ size = 22, lit = true }: { size?: number; lit?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <defs>
      <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={lit ? "#FFC53D" : "#D6D0E6"} />
        <stop offset="1" stopColor={lit ? "#F5564A" : "#B3AAC9"} />
      </linearGradient>
    </defs>
    <path d="M12 2c1 3.5 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.2 2.6-5.4.2 1.7 1 2.8 2.1 3.2C10.6 8 11 5 12 2z" fill="url(#fl)" />
    <path d="M12 21a3 3 0 0 1-3-3c0-1.8 1.5-2.8 2.2-4 .5 1.5 1.3 2 2 2.3.9.5 1.8 1 1.8 1.9A3 3 0 0 1 12 21z" fill={lit ? "#FFE58A" : "#EEEAF7"} />
  </svg>
);

/** Purple gem used for XP. */
export const Gem = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="#7C4DFF" />
    <path d="M12 2 21 7l-9 5-9-5z" fill="#B79BFF" />
    <path d="M12 12v10l-9-5V7z" fill="#6A35F0" />
  </svg>
);

export const Heart = ({ size = 20, full = true }: { size?: number; full?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" fill={full ? "#F5564A" : "#E3DDF0"} />
    {full && <ellipse cx="8.5" cy="8.5" rx="2" ry="1.3" fill="#fff" opacity="0.7" />}
  </svg>
);

export const Crown = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#FFC53D" stroke="#F5A70B" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);
