import { memo } from 'react';

/** Island decorations — each drawn with its base at (0,0). */
export const Deco = memo(function Deco({ id, night = false }: { id: string; night?: boolean }) {
  const sh = <ellipse cx="0" cy="1" rx="18" ry="5" fill="#2b2140" opacity=".18" />;
  switch (id) {
    case 'lantern':
      return (
        <g>
          {sh}
          <rect x="-2" y="-40" width="4" height="40" fill="#6b4a2a" />
          <path d="M-2 -40 Q8 -46 12 -38" stroke="#6b4a2a" strokeWidth="3" fill="none" />
          <rect x="6" y="-38" width="12" height="16" rx="4" fill={night ? '#ffd770' : '#f6c979'} stroke="#b07a2a" strokeWidth="1.5" className={night ? 'glowpulse' : undefined} />
        </g>
      );
    case 'flowerpot':
      return (
        <g>
          {sh}
          <path d="M-12 0 L-14 -16 L14 -16 L12 0Z" fill="#d77d52" />
          <rect x="-16" y="-20" width="32" height="6" rx="3" fill="#e8946a" />
          {[-8, 0, 8].map((x, i) => (
            <g key={x}>
              <path d={`M${x} -20 L${x + (i - 1) * 2} -34`} stroke="#5f9a4a" strokeWidth="2" />
              {[0, 1, 2].map((k) => (
                <ellipse key={k} cx={x + (i - 1) * 2} cy={-34 + k * 4} rx="3" ry="2.4" fill="#a98be6" />
              ))}
            </g>
          ))}
        </g>
      );
    case 'bench':
      return (
        <g>
          <ellipse cy="1" rx="30" ry="6" fill="#2b2140" opacity=".18" />
          <rect x="-26" y="-16" width="52" height="6" rx="2" fill="#b5835a" />
          <rect x="-26" y="-30" width="52" height="5" rx="2" fill="#c9966a" />
          <rect x="-26" y="-24" width="52" height="5" rx="2" fill="#c9966a" />
          <rect x="-22" y="-12" width="4" height="12" fill="#6b4a2a" />
          <rect x="18" y="-12" width="4" height="12" fill="#6b4a2a" />
        </g>
      );
    case 'ball':
      return (
        <g>
          <ellipse cy="1" rx="9" ry="3" fill="#2b2140" opacity=".2" />
          <circle cy="-9" r="9" fill="#b7e03a" />
          <path d="M-7 -14 Q0 -9 -7 -3 M7 -15 Q0 -9 7 -3" stroke="#fff" strokeWidth="2" fill="none" />
        </g>
      );
    case 'dogbed':
      return (
        <g>
          <ellipse cy="1" rx="30" ry="7" fill="#2b2140" opacity=".18" />
          <ellipse cy="-8" rx="28" ry="12" fill="#9c7ad8" />
          <ellipse cy="-10" rx="20" ry="7" fill="#efe6ff" />
          <path d="M-28 -8 Q0 -26 28 -8" stroke="#b9a2ec" strokeWidth="6" fill="none" />
        </g>
      );
    case 'mushroom':
      return (
        <g>
          {sh}
          <path d="M-5 0 L-4 -18 L4 -18 L5 0Z" fill="#fff3e0" />
          <path d="M-18 -16 Q-16 -36 0 -38 Q16 -36 18 -16Z" fill={night ? '#ffa1c4' : '#e9837a'} className={night ? 'glowpulse' : undefined} />
          <circle cx="-7" cy="-26" r="3" fill="#fff" />
          <circle cx="6" cy="-30" r="2.4" fill="#fff" />
          <circle cx="9" cy="-21" r="2" fill="#fff" />
        </g>
      );
    case 'signpost':
      return (
        <g>
          {sh}
          <rect x="-2" y="-44" width="4" height="44" fill="#8a5d3b" />
          <path d="M0 -42 L24 -42 L30 -36 L24 -30 L0 -30Z" fill="#e2b98a" />
          <path d="M0 -28 L-22 -28 L-28 -22 L-22 -16 L0 -16Z" fill="#d9a873" />
        </g>
      );
    case 'mailbox':
      return (
        <g>
          {sh}
          <rect x="-2" y="-26" width="4" height="26" fill="#8a5d3b" />
          <path d="M-12 -26 L-12 -40 Q0 -50 12 -40 L12 -26Z" fill="#8c6fd6" />
          <rect x="12" y="-46" width="3" height="12" fill="#e0697a" />
          <rect x="15" y="-46" width="8" height="5" fill="#e0697a" />
        </g>
      );
    case 'picnic':
      return (
        <g>
          <path d="M-30 -4 L0 -16 L30 -4 L0 8Z" fill="#f6ead0" />
          <path d="M-20 -8 L10 4 M-10 -12 L20 0 M0 -16 L30 -4 M-30 -4 L0 8 M-20 0 L10 -12 M-10 4 L20 -8" stroke="#e87b8f" strokeWidth="3" opacity=".7" />
          <rect x="-6" y="-20" width="14" height="10" rx="2" fill="#b5835a" />
          <path d="M-4 -20 Q1 -28 6 -20" stroke="#8a5d3b" strokeWidth="2" fill="none" />
        </g>
      );
    case 'birdhouse':
      return (
        <g>
          {sh}
          <rect x="-2" y="-30" width="4" height="30" fill="#8a5d3b" />
          <rect x="-11" y="-50" width="22" height="20" fill="#9fd3f2" />
          <path d="M-15 -48 L0 -62 L15 -48Z" fill="#e0697a" />
          <circle cy="-41" r="4" fill="#3d3a6b" />
        </g>
      );
    case 'windmill':
      return (
        <g>
          <ellipse cy="1" rx="22" ry="6" fill="#2b2140" opacity=".18" />
          <path d="M-14 0 L-9 -50 L9 -50 L14 0Z" fill="#fbe9cf" />
          <path d="M-11 -50 L0 -62 L11 -50Z" fill="#8c6fd6" />
          <rect x="-4" y="-12" width="8" height="12" rx="4" fill="#8a5d3b" />
          <g transform="translate(0 -52)">
            <g className="spin">
              {[0, 90, 180, 270].map((r) => (
                <rect key={r} x="-3" y="-30" width="6" height="28" rx="2" fill="#f6ead0" stroke="#b5835a" transform={`rotate(${r})`} />
              ))}
            </g>
            <circle r="3" fill="#6b4a2a" />
          </g>
        </g>
      );
    case 'tent':
      return (
        <g>
          <ellipse cy="1" rx="30" ry="7" fill="#2b2140" opacity=".18" />
          <path d="M-30 0 L0 -40 L30 0Z" fill="#5fae7a" />
          <path d="M0 -40 L30 0 L14 0Z" fill="#4e8b57" />
          <path d="M-8 0 L0 -20 L8 0Z" fill="#2f5a3a" />
          <path d="M0 -40 L0 -48 L10 -45 L0 -42" fill="#f2b54a" />
        </g>
      );
    case 'arch':
      return (
        <g>
          <path d="M-26 0 L-26 -30 Q0 -64 26 -30 L26 0" stroke="#7ba86a" strokeWidth="6" fill="none" />
          {Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI * (i / 8);
            return <circle key={i} cx={-Math.cos(a) * 26} cy={-30 - Math.sin(a) * 22} r="3" fill={['#ffe38a', '#f6a8c4', '#9fd3f2'][i % 3]} className="twinkle" style={{ animationDelay: `${i * 0.2}s` }} />;
          })}
        </g>
      );
    case 'pumpkin':
      return (
        <g>
          {sh}
          <ellipse cx="-7" cy="-11" rx="9" ry="11" fill="#e97f32" />
          <ellipse cx="7" cy="-11" rx="9" ry="11" fill="#e97f32" />
          <ellipse cy="-11" rx="9" ry="12" fill="#f39a46" />
          <path d="M0 -22 Q2 -28 6 -29" stroke="#5f7a3a" strokeWidth="3" fill="none" />
        </g>
      );
    case 'snowdog':
      return (
        <g>
          {sh}
          <circle cy="-12" r="12" fill="#fff" stroke="#dfe7f2" />
          <circle cy="-32" r="10" fill="#fff" stroke="#dfe7f2" />
          <ellipse cx="-9" cy="-36" rx="4" ry="7" fill="#cfd9ea" />
          <ellipse cx="9" cy="-36" rx="4" ry="7" fill="#cfd9ea" />
          <circle cx="-3" cy="-34" r="1.4" fill="#2b2131" />
          <circle cx="3" cy="-34" r="1.4" fill="#2b2131" />
          <circle cy="-30" r="2" fill="#2b2131" />
          <path d="M-10 -22 Q0 -18 10 -22" stroke="#e0697a" strokeWidth="4" fill="none" />
        </g>
      );
    case 'telescope':
      return (
        <g>
          {sh}
          <path d="M0 -20 L-10 0 M0 -20 L10 0 M0 -20 L0 0" stroke="#6b4a2a" strokeWidth="2.5" />
          <rect x="-22" y="-34" width="38" height="11" rx="5" fill="#3d3a6b" transform="rotate(-24)" />
          <rect x="10" y="-42" width="10" height="13" rx="3" fill="#f2c14e" transform="rotate(-24)" />
        </g>
      );
    case 'crystal':
      return (
        <g className={night ? 'glowpulse' : undefined}>
          {sh}
          <path d="M-6 0 L-14 -16 L-6 -38 L2 -16Z" fill="#c8b6f5" />
          <path d="M2 0 L-4 -20 L6 -46 L14 -20Z" fill="#a98be6" />
          <path d="M6 -46 L14 -20 L6 -20Z" fill="#e8deff" opacity=".7" />
        </g>
      );
    default:
      return <circle r="8" fill="#ccc" />;
  }
});
