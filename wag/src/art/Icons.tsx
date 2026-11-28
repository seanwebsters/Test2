import type { CSSProperties } from 'react';

type P = { size?: number; className?: string; style?: CSSProperties };

export const Coin = ({ size = 22, ...r }: P) => (
  <svg viewBox="0 0 40 40" width={size} height={size} {...r}>
    <defs>
      <radialGradient id="coin-g" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#fff2b0" />
        <stop offset="55%" stopColor="#f6bf3a" />
        <stop offset="100%" stopColor="#c98600" />
      </radialGradient>
    </defs>
    <circle cx="20" cy="21" r="17" fill="#b07400" />
    <circle cx="20" cy="19" r="17" fill="url(#coin-g)" />
    <circle cx="20" cy="19" r="12.5" fill="none" stroke="#e7a51c" strokeWidth="2" />
    <g fill="#b06f00">
      <ellipse cx="20" cy="22.5" rx="5" ry="4" />
      <circle cx="14.5" cy="17" r="2" />
      <circle cx="18" cy="13.5" r="2" />
      <circle cx="22" cy="13.5" r="2" />
      <circle cx="25.5" cy="17" r="2" />
    </g>
  </svg>
);

export const Seed = ({ size = 22, ...r }: P) => (
  <svg viewBox="0 0 40 40" width={size} height={size} {...r}>
    <defs>
      <linearGradient id="seed-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f0e2ff" />
        <stop offset="50%" stopColor="#b48cf2" />
        <stop offset="100%" stopColor="#7046c8" />
      </linearGradient>
    </defs>
    <path d="M20 3 L33 16 L20 37 L7 16Z" fill="url(#seed-g)" stroke="#6a40c0" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M7 16 L33 16 M20 3 L15 16 L20 37 M20 3 L25 16 L20 37" stroke="#fff" strokeOpacity=".45" strokeWidth="1.2" fill="none" />
  </svg>
);

export const Star = ({ size = 22, dim = false, ...r }: P & { dim?: boolean }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} {...r}>
    <defs>
      <linearGradient id="star-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff4a8" />
        <stop offset="55%" stopColor="#ffc928" />
        <stop offset="100%" stopColor="#e08a00" />
      </linearGradient>
    </defs>
    <path
      d="M20 3.5 L25 14 L36.5 15.5 L28 23.5 L30.2 35 L20 29.4 L9.8 35 L12 23.5 L3.5 15.5 L15 14Z"
      fill={dim ? '#e4dcef' : 'url(#star-g)'}
      stroke={dim ? '#cfc3e0' : '#c97a00'}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {!dim && <path d="M14 15 Q18 11 20 8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".7" fill="none" />}
  </svg>
);

export const MapIcon = ({ size = 22, ...r }: P) => (
  <svg viewBox="0 0 40 40" width={size} height={size} {...r}>
    <path d="M5 9 L14 6 L26 10 L35 7 L35 31 L26 34 L14 30 L5 33Z" fill="#f3dfb3" stroke="#a7794a" strokeWidth="2" strokeLinejoin="round" />
    <path d="M14 6 L14 30 M26 10 L26 34" stroke="#d6b886" strokeWidth="1.5" />
    <path d="M9 26 Q14 18 20 22 Q25 25 28 17" stroke="#c0553f" strokeWidth="2" strokeDasharray="2 3" fill="none" />
    <path d="M26 13 l4 4 M30 13 l-4 4" stroke="#c0553f" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const Heart = ({ size = 22, filled = true, ...r }: P & { filled?: boolean }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} {...r}>
    <path d="M20 34 C 8 26, 3 19, 6 12 C 9 6, 17 6, 20 12 C 23 6, 31 6, 34 12 C 37 19, 32 26, 20 34Z" fill={filled ? '#f0607e' : 'none'} stroke={filled ? '#c83e5e' : 'currentColor'} strokeWidth="2.4" strokeLinejoin="round" />
    {filled && <path d="M11 13 Q13 10 16 11" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".7" fill="none" />}
  </svg>
);

export const Flame = ({ size = 18, ...r }: P) => (
  <svg viewBox="0 0 40 40" width={size} height={size} {...r}>
    <path d="M20 36 C 10 36, 6 28, 9 20 C 11 15, 15 13, 15 7 C 21 10, 24 15, 23 19 C 26 18, 27 15, 27 13 C 32 18, 33 24, 31 29 C 29 34, 25 36, 20 36Z" fill="#ff8a3d" />
    <path d="M20 36 C 15 36, 13 32, 15 28 C 16 26, 18 25, 18 22 C 22 24, 25 28, 24 31 C 23 34, 22 36, 20 36Z" fill="#ffd36e" />
  </svg>
);

export const Moves = ({ size = 18, ...r }: P) => (
  <svg viewBox="0 0 40 40" width={size} height={size} {...r}>
    <circle cx="20" cy="20" r="16" fill="#5fae7a" stroke="#3f8758" strokeWidth="2" />
    <path d="M13 21 L20 12 L27 21 M20 12 L20 29" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const NavIcon = ({ name, active }: { name: 'world' | 'play' | 'adventure' | 'diary' | 'friends'; active: boolean }) => {
  const fill = active ? 'currentColor' : 'none';
  switch (name) {
    case 'world':
      return (
        <svg viewBox="0 0 32 32" width="26" height="26">
          <path d="M5 15 L16 6 L27 15 L27 27 L5 27Z" {...stroke} fill={fill} fillOpacity={0.18} />
          <path d="M13 27 L13 20 Q16 17 19 20 L19 27" {...stroke} />
        </svg>
      );
    case 'play':
      return (
        <svg viewBox="0 0 32 32" width="26" height="26">
          <rect x="4" y="9" width="24" height="16" rx="8" {...stroke} fill={fill} fillOpacity={0.18} />
          <path d="M10 14 L10 20 M7 17 L13 17" {...stroke} />
          <circle cx="21" cy="15" r="1.6" fill="currentColor" />
          <circle cx="24" cy="19" r="1.6" fill="currentColor" />
        </svg>
      );
    case 'adventure':
      return (
        <svg viewBox="0 0 32 32" width="26" height="26">
          <g fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2">
            <ellipse cx="16" cy="20" rx="6" ry="5" fillOpacity={0.25} />
            <ellipse cx="7.5" cy="13" rx="2.6" ry="3.4" />
            <ellipse cx="12.5" cy="7.5" rx="2.6" ry="3.4" />
            <ellipse cx="19.5" cy="7.5" rx="2.6" ry="3.4" />
            <ellipse cx="24.5" cy="13" rx="2.6" ry="3.4" />
          </g>
        </svg>
      );
    case 'diary':
      return (
        <svg viewBox="0 0 32 32" width="26" height="26">
          <path d="M4 8 Q10 5 16 9 Q22 5 28 8 L28 25 Q22 22 16 26 Q10 22 4 25Z" {...stroke} fill={fill} fillOpacity={0.18} />
          <path d="M16 9 L16 26" {...stroke} />
        </svg>
      );
    case 'friends':
      return (
        <svg viewBox="0 0 32 32" width="26" height="26">
          <circle cx="11" cy="12" r="4.5" {...stroke} fill={fill} fillOpacity={0.18} />
          <circle cx="22" cy="13" r="3.6" {...stroke} />
          <path d="M3 26 Q3 18 11 18 Q19 18 19 26 M19 19 Q21 17.5 23 17.5 Q29 17.5 29 25" {...stroke} />
        </svg>
      );
  }
};

export const Icon = ({ name, size = 22 }: { name: 'chev' | 'back' | 'close' | 'check' | 'lock' | 'camera' | 'share' | 'plus' | 'gear' | 'play' | 'pause' | 'stop' | 'gift' | 'pin' | 'sparkle' | 'leaf' | 'book' | 'cap' | 'bag' | 'hand' | 'moon' | 'sun' | 'trash' | 'refresh'; size?: number }) => {
  const s = { width: size, height: size, viewBox: '0 0 24 24' };
  const st = { ...stroke, strokeWidth: 2.2 };
  switch (name) {
    case 'chev':
      return <svg {...s}><path d="M9 5 L16 12 L9 19" {...st} /></svg>;
    case 'back':
      return <svg {...s}><path d="M15 5 L8 12 L15 19" {...st} /></svg>;
    case 'close':
      return <svg {...s}><path d="M6 6 L18 18 M18 6 L6 18" {...st} /></svg>;
    case 'check':
      return <svg {...s}><path d="M5 12.5 L10 17 L19 7" {...st} strokeWidth={3} /></svg>;
    case 'lock':
      return <svg {...s}><rect x="5" y="11" width="14" height="10" rx="3" {...st} /><path d="M8 11 V8 a4 4 0 0 1 8 0 V11" {...st} /></svg>;
    case 'camera':
      return <svg {...s}><path d="M4 8 h3 l2 -3 h6 l2 3 h3 v11 h-16z" {...st} /><circle cx="12" cy="13" r="3.5" {...st} /></svg>;
    case 'share':
      return <svg {...s}><path d="M12 3 V15 M7 8 L12 3 L17 8 M5 13 V20 H19 V13" {...st} /></svg>;
    case 'plus':
      return <svg {...s}><path d="M12 5 V19 M5 12 H19" {...st} strokeWidth={3} /></svg>;
    case 'gear':
      return <svg {...s}><circle cx="12" cy="12" r="3.2" {...st} /><path d="M12 2.5 v3 M12 18.5 v3 M2.5 12 h3 M18.5 12 h3 M5.2 5.2 l2.1 2.1 M16.7 16.7 l2.1 2.1 M5.2 18.8 l2.1 -2.1 M16.7 7.3 l2.1 -2.1" {...st} /></svg>;
    case 'play':
      return <svg {...s}><path d="M8 5 L19 12 L8 19Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    case 'pause':
      return <svg {...s}><path d="M8 5 V19 M16 5 V19" {...st} strokeWidth={3.4} /></svg>;
    case 'stop':
      return <svg {...s}><rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" /></svg>;
    case 'gift':
      return <svg {...s}><rect x="4" y="9" width="16" height="11" rx="2" {...st} /><path d="M3 9 H21 M12 9 V20 M12 9 C 9 4, 5 6, 8 9 M12 9 C 15 4, 19 6, 16 9" {...st} /></svg>;
    case 'pin':
      return <svg {...s}><path d="M12 21 C 7 15, 5 12, 5 9 a7 7 0 0 1 14 0 C 19 12, 17 15, 12 21Z" {...st} /><circle cx="12" cy="9" r="2.4" {...st} /></svg>;
    case 'sparkle':
      return <svg {...s}><path d="M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2Z" fill="currentColor" /></svg>;
    case 'leaf':
      return <svg {...s}><path d="M5 19 C 5 9, 11 5, 20 4 C 19 13, 15 19, 5 19Z M5 19 L13 11" {...st} /></svg>;
    case 'book':
      return <svg {...s}><path d="M4 5 Q8 3 12 6 Q16 3 20 5 V19 Q16 17 12 20 Q8 17 4 19Z M12 6 V20" {...st} /></svg>;
    case 'cap':
      return <svg {...s}><path d="M2 9 L12 4 L22 9 L12 14Z M6 11 V16 Q12 20 18 16 V11" {...st} /></svg>;
    case 'bag':
      return <svg {...s}><path d="M5 8 H19 L18 20 H6Z M9 8 V6 a3 3 0 0 1 6 0 V8" {...st} /></svg>;
    case 'hand':
      return <svg {...s}><path d="M8 13 V6 a1.5 1.5 0 0 1 3 0 V12 M11 11 V4.5 a1.5 1.5 0 0 1 3 0 V12 M14 11.5 V6 a1.5 1.5 0 0 1 3 0 V14 Q17 21 11 21 Q7 21 5 16 L4 13 a1.5 1.5 0 0 1 2.6 -1.4 L8 14" {...st} /></svg>;
    case 'moon':
      return <svg {...s}><path d="M19 15 A8 8 0 1 1 10 5 A6.5 6.5 0 0 0 19 15Z" {...st} /></svg>;
    case 'sun':
      return <svg {...s}><circle cx="12" cy="12" r="4" {...st} /><path d="M12 2 v2.5 M12 19.5 V22 M2 12 h2.5 M19.5 12 H22 M5 5 l1.8 1.8 M17.2 17.2 L19 19 M5 19 l1.8 -1.8 M17.2 6.8 L19 5" {...st} /></svg>;
    case 'trash':
      return <svg {...s}><path d="M5 7 H19 M9 7 V4 H15 V7 M7 7 L8 20 H16 L17 7" {...st} /></svg>;
    case 'refresh':
      return <svg {...s}><path d="M20 11 A8 8 0 1 0 18 17 M20 5 V11 H14" {...st} /></svg>;
  }
};
