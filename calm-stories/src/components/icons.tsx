import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const PlayIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 4.5v15l12-7.5-12-7.5z" fill="currentColor" stroke="none" />
  </Icon>
);
export const PauseIcon = (p: P) => (
  <Icon {...p}>
    <rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" />
  </Icon>
);
export const BackIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 0 2.3-5.7" />
    <path d="M4 4v4h4" />
    <text x="12" y="15.5" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="system-ui">15</text>
  </Icon>
);
export const ForwardIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7" />
    <path d="M20 4v4h-4" />
    <text x="12" y="15.5" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="system-ui">30</text>
  </Icon>
);
export const NextIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 5l9 7-9 7V5z" fill="currentColor" stroke="none" />
    <path d="M18 5v14" />
  </Icon>
);
export const PrevIcon = (p: P) => (
  <Icon {...p}>
    <path d="M18 5l-9 7 9 7V5z" fill="currentColor" stroke="none" />
    <path d="M6 5v14" />
  </Icon>
);
export const MoonIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Icon>
);
export const VolumeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7" />
  </Icon>
);
export const SearchIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </Icon>
);
export const BookmarkIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Icon {...p}>
    <path d="M6 4h12v16l-6-4-6 4V4z" fill={filled ? "currentColor" : "none"} />
  </Icon>
);
export const PlusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
export const ChevronLeft = (p: P) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);
export const ChevronRight = (p: P) => (
  <Icon {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);
export const ChevronDown = (p: P) => (
  <Icon {...p}>
    <path d="M5 9l7 7 7-7" />
  </Icon>
);
export const LockIcon = (p: P) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Icon>
);
export const SparkleIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
  </Icon>
);
export const UserIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Icon>
);
export const ExpandIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 15l6-6 6 6" />
  </Icon>
);
export const MenuIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);
export const WaveIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0" />
  </Icon>
);
export const SendIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />
  </Icon>
);
export const BellIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Icon>
);
