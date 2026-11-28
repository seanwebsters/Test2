import { memo } from 'react';

const Eyes = ({ y = 0, gap = 5, r = 1.8 }) => (
  <g fill="#2b2131">
    <circle cx={-gap} cy={y} r={r} />
    <circle cx={gap} cy={y} r={r} />
    <circle cx={-gap + 0.6} cy={y - 0.7} r={r * 0.35} fill="#fff" />
    <circle cx={gap + 0.6} cy={y - 0.7} r={r * 0.35} fill="#fff" />
  </g>
);
const Blush = ({ y = 3, gap = 8 }) => (
  <g fill="#f58ea0" opacity=".55">
    <ellipse cx={-gap} cy={y} rx="2.4" ry="1.4" />
    <ellipse cx={gap} cy={y} rx="2.4" ry="1.4" />
  </g>
);

/** Collectible magical creatures, viewBox centred on 0,0 (≈ 40×40). */
export const Creature = memo(function Creature({ id, size = 40, silhouette = false }: { id: string; size?: number; silhouette?: boolean }) {
  let body: React.ReactNode;
  switch (id) {
    case 'glowmoth':
      body = (
        <g>
          <g className="flutter">
            <ellipse cx="-10" cy="-2" rx="10" ry="8" fill="#fbe7a1" />
            <ellipse cx="10" cy="-2" rx="10" ry="8" fill="#fbe7a1" />
            <circle cx="-10" cy="-2" r="3" fill="#f2b54a" />
            <circle cx="10" cy="-2" r="3" fill="#f2b54a" />
          </g>
          <ellipse cy="2" rx="6" ry="9" fill="#f8d77a" />
          <Eyes y={0} gap={2.6} r={1.3} />
          <path d="M-2 -8 Q-6 -16 -8 -14 M2 -8 Q6 -16 8 -14" stroke="#c99a3a" strokeWidth="1.2" fill="none" />
        </g>
      );
      break;
    case 'puffcap':
      body = (
        <g>
          <ellipse cy="8" rx="9" ry="9" fill="#fff3e0" />
          <path d="M-16 2 Q-14 -18 0 -18 Q14 -18 16 2Z" fill="#e9837a" />
          <circle cx="-7" cy="-8" r="2.6" fill="#fff" />
          <circle cx="6" cy="-11" r="2" fill="#fff" />
          <Eyes y={8} gap={3.4} r={1.4} />
          <Blush y={11} gap={6} />
        </g>
      );
      break;
    case 'mossbun':
      body = (
        <g>
          <ellipse cx="-5" cy="-14" rx="3.6" ry="9" fill="#8cc47a" transform="rotate(-12 -5 -14)" />
          <ellipse cx="5" cy="-14" rx="3.6" ry="9" fill="#8cc47a" transform="rotate(12 5 -14)" />
          <ellipse cy="4" rx="13" ry="12" fill="#a6d48f" />
          <circle cx="8" cy="-6" r="3" fill="#f6a8c4" />
          <Eyes y={2} gap={4.5} r={1.5} />
          <Blush y={6} gap={8} />
        </g>
      );
      break;
    case 'dewdrop':
      body = (
        <g>
          <path d="M0 -18 Q14 0 12 8 Q10 18 0 18 Q-10 18 -12 8 Q-14 0 0 -18Z" fill="#9fdcf5" opacity=".92" />
          <ellipse cx="-4" cy="-2" rx="3" ry="5" fill="#fff" opacity=".7" />
          <Eyes y={6} gap={4} r={1.5} />
          <path d="M-2 11 Q0 13 2 11" stroke="#2b2131" strokeWidth="1.2" fill="none" />
        </g>
      );
      break;
    case 'sunbeetle':
      body = (
        <g>
          <ellipse cy="2" rx="13" ry="12" fill="#f2a93b" />
          <path d="M0 -10 L0 14" stroke="#c87d1a" strokeWidth="1.5" />
          <circle cx="-6" cy="4" r="2.4" fill="#ffe38a" />
          <circle cx="6" cy="0" r="2" fill="#ffe38a" />
          <ellipse cy="-10" rx="8" ry="5" fill="#5b3a2a" />
          <Eyes y={-10} gap={3} r={1.2} />
        </g>
      );
      break;
    case 'cloudpup':
      body = (
        <g>
          <circle cx="-9" cy="2" r="9" fill="#f4f1ff" />
          <circle cx="9" cy="2" r="9" fill="#f4f1ff" />
          <circle cy="-4" r="11" fill="#fff" />
          <ellipse cx="-11" cy="-10" rx="4" ry="6" fill="#e3dcfb" transform="rotate(-20 -11 -10)" />
          <ellipse cx="11" cy="-10" rx="4" ry="6" fill="#e3dcfb" transform="rotate(20 11 -10)" />
          <Eyes y={-3} gap={4} r={1.5} />
          <ellipse cy="2" rx="2" ry="1.4" fill="#2b2131" />
          <Blush y={2} gap={8} />
        </g>
      );
      break;
    case 'starfox':
      body = (
        <g>
          <path d="M10 8 Q22 0 18 -10 Q14 4 6 4Z" fill="#c8b6f5" />
          <ellipse cy="6" rx="10" ry="9" fill="#b49cf0" />
          <path d="M-10 -4 L-8 -18 L-2 -8 M10 -4 L8 -18 L2 -8" fill="#b49cf0" />
          <ellipse cy="-2" rx="10" ry="8" fill="#b49cf0" />
          <ellipse cy="1" rx="5" ry="4" fill="#efe8ff" />
          <Eyes y={-3} gap={4} r={1.4} />
          <path d="M12 -14 l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1Z" fill="#ffe38a" />
        </g>
      );
      break;
    case 'pebbleturtle':
      body = (
        <g>
          <ellipse cx="-12" cy="6" rx="5" ry="4" fill="#c4d4a8" />
          <ellipse cy="2" rx="14" ry="10" fill="#8d9b86" />
          <path d="M-8 -2 L0 -6 L8 -2 L6 6 L-6 6Z" fill="#a9b6a0" />
          <ellipse cx="14" cy="4" rx="6" ry="5" fill="#c4d4a8" />
          <circle cx="16" cy="3" r="1.2" fill="#2b2131" />
        </g>
      );
      break;
    default:
      body = <circle r="10" fill="#ccc" />;
  }
  return (
    <svg viewBox="-22 -22 44 44" width={size} height={size} style={{ overflow: 'visible', filter: silhouette ? 'brightness(0) opacity(.18)' : undefined }} x={-size / 2} y={-size / 2}>
      {body}
    </svg>
  );
});
