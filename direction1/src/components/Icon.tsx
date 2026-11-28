import type { JSX } from 'react';

export type IconName =
  | 'journey' | 'explore' | 'play' | 'you' | 'back' | 'close' | 'search' | 'bookmark' | 'bookmarkFill'
  | 'chevron' | 'send' | 'flame' | 'bolt' | 'gem' | 'key' | 'lock' | 'check' | 'playFill' | 'pause'
  | 'skipBack' | 'skipFwd' | 'clock' | 'pound' | 'settings' | 'crown' | 'filter' | 'star' | 'gift'
  | 'route' | 'plus' | 'trash' | 'volume' | 'mute' | 'info' | 'sparkle' | 'refresh' | 'map';

const P: Record<IconName, JSX.Element> = {
  journey: <><path d="M6 20c0-4 3-5 6-5s6-1 6-5-3-5-6-5" /><circle cx="6" cy="20" r="1.6" fill="currentColor" /><circle cx="12" cy="5" r="1.6" fill="currentColor" /></>,
  explore: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5Z" fill="currentColor" /></>,
  play: <><rect x="3" y="7" width="18" height="11" rx="5" /><path d="M8 10.5v4M6 12.5h4" /><circle cx="15.5" cy="11.5" r="1" fill="currentColor" /><circle cx="17.5" cy="14" r="1" fill="currentColor" /></>,
  you: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  bookmark: <path d="M6 4h12v17l-6-4-6 4Z" />,
  bookmarkFill: <path d="M6 4h12v17l-6-4-6 4Z" fill="currentColor" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  send: <path d="M4 12l16-8-6 17-3-7Z" fill="currentColor" />,
  flame: <path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 4 1-2 1-5 1-8Z" fill="currentColor" stroke="none" />,
  bolt: <path d="M13 2L5 14h6l-1 8 8-12h-6Z" fill="currentColor" stroke="none" />,
  gem: <path d="M7 4h10l4 5-9 11L3 9Z" fill="currentColor" stroke="none" />,
  key: <><circle cx="8" cy="9" r="4.5" /><path d="M11.5 12l8 8M16 16.5l2-2" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  playFill: <path d="M8 5l11 7-11 7Z" fill="currentColor" />,
  pause: <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></>,
  skipBack: <><path d="M11 7l-6 5 6 5Z" fill="currentColor" /><path d="M19 7l-6 5 6 5Z" fill="currentColor" /></>,
  skipFwd: <><path d="M13 7l6 5-6 5Z" fill="currentColor" /><path d="M5 7l6 5-6 5Z" fill="currentColor" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pound: <path d="M16 6.5A4 4 0 0 0 9 9v10M7 13h7M7 19h10" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  crown: <path d="M4 18l-1-10 5 4 4-7 4 7 5-4-1 10Z" fill="currentColor" stroke="none" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  star: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.2-.9Z" fill="currentColor" stroke="none" />,
  gift: <><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1" /></>,
  route: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  volume: <><path d="M4 10h4l5-4v12l-5-4H4Z" fill="currentColor" /><path d="M16 9c1.5 1.5 1.5 4.5 0 6M19 6.5c3 3 3 8 0 11" /></>,
  mute: <><path d="M4 10h4l5-4v12l-5-4H4Z" fill="currentColor" /><path d="M17 9l5 6M22 9l-5 6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
  sparkle: <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="currentColor" stroke="none" />,
  refresh: <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />,
  map: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z" /><path d="M9 4v14M15 6v14" /></>,
};

export function Icon({ name, size = 22, className = '', stroke = 2.4 }: { name: IconName; size?: number; className?: string; stroke?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}
