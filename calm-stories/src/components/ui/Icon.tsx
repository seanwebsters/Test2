import type { SVGProps } from "react";

const PATHS = {
  play: <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <g fill="currentColor" stroke="none">
      <rect x="6" y="5" width="4.5" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" />
    </g>
  ),
  back15: (
    <>
      <path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.5" />
      <path d="M4 4v4.5h4.5" />
      <text x="12" y="15.5" fontSize="7.5" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="system-ui" fontWeight="600">15</text>
    </>
  ),
  fwd30: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.5" />
      <path d="M20 4v4.5h-4.5" />
      <text x="12" y="15.5" fontSize="7.5" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="system-ui" fontWeight="600">30</text>
    </>
  ),
  next: (
    <>
      <path d="M6 5.5v13l9-6.5-9-6.5Z" fill="currentColor" />
      <path d="M18 5v14" />
    </>
  ),
  prev: (
    <>
      <path d="M18 5.5v13L9 12l9-6.5Z" fill="currentColor" />
      <path d="M6 5v14" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  volume: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" fill="currentColor" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" fill="currentColor" />
      <path d="m16 9.5 5 5m0-5-5 5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" />,
  bookmark: <path d="M7 4.5h10v15.5l-5-3.5-5 3.5V4.5Z" />,
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15L6 16.5Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  sparkle: <path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2L12 3.5Z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  expand: <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  wand: (
    <>
      <path d="m4 20 11-11" />
      <path d="M15 3v3M15 12v3M10.5 7.5h-3M22.5 7.5h-3M18.2 4.3l-1.4 1.4M18.2 10.7l-1.4-1.4" />
    </>
  ),
  wave: <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0" />,
  flag: <path d="M5 21V4.5h11l-1.5 3.5L16 11.5H5" />,
  trash: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8.5" />
      <path d="M4 4v4.5h4.5M4 13a8 8 0 0 0 14.5 4.5L20 15.5" />
      <path d="M20 20v-4.5h-4.5" />
    </>
  ),
  upload: <path d="M12 16V4.5M7 9l5-5 5 5M5 19.5h14" />,
  send: <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  library: <path d="M5 4.5v15M9.5 4.5v15M14 5l4.5 14.5" />,
  home: <path d="M4 11 12 4.5l8 6.5V20h-5.5v-5.5h-5V20H4v-9Z" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
