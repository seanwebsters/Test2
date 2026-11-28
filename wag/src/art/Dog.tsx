import { motion, type TargetAndTransition } from 'framer-motion';
import { useEffect, useId, useState } from 'react';
import { COATS } from '../game/data';
import type { DogLook, HatId } from '../game/types';

export type Pose =
  | 'idle'
  | 'happy'
  | 'excited'
  | 'spin'
  | 'bow'
  | 'wave'
  | 'sleep'
  | 'celebrate'
  | 'sad'
  | 'sniff'
  | 'perk'
  | 'boop'
  | 'walk'
  | 'roll';

interface Props {
  look: DogLook;
  pose?: Pose;
  size?: number;
  className?: string;
  onClick?: () => void;
  shadow?: boolean;
  flip?: boolean;
}

const BODY_ANIM: Partial<Record<Pose, TargetAndTransition>> = {
  idle: { y: [0, -1.5, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
  happy: { y: [0, -6, 0], transition: { duration: 0.5, repeat: Infinity, ease: 'easeOut' } },
  excited: { y: [0, -16, 0, -8, 0], rotate: [0, -4, 0, 4, 0], transition: { duration: 0.7, repeat: Infinity } },
  celebrate: { y: [0, -34, 0, -20, 0], rotate: [0, -8, 0, 8, 0], transition: { duration: 0.9, repeat: Infinity } },
  spin: { rotateY: [0, 360], y: [0, -14, 0], transition: { duration: 0.8, repeat: Infinity, repeatDelay: 0.2 } },
  bow: { rotate: [0, 12, 12, 0], y: [0, 8, 8, 0], transition: { duration: 1.4, repeat: Infinity, repeatDelay: 0.3 } },
  sad: { y: [0, 2, 0], transition: { duration: 2.4, repeat: Infinity } },
  sleep: { scaleY: [1, 0.97, 1], transition: { duration: 3.4, repeat: Infinity } },
  sniff: { x: [0, -3, 0, -3, 0], rotate: [0, 3, 0], transition: { duration: 0.6, repeat: Infinity } },
  perk: { rotate: [0, -8, -8, 0], transition: { duration: 1.6, repeat: Infinity, repeatDelay: 0.4 } },
  boop: { scale: [1, 1.08, 1], transition: { duration: 0.5, repeat: Infinity, repeatDelay: 0.5 } },
  walk: { y: [0, -4, 0], rotate: [-2, 2, -2], transition: { duration: 0.42, repeat: Infinity } },
  wave: { rotate: [0, -3, 0], transition: { duration: 0.8, repeat: Infinity } },
  roll: { rotate: [0, 360], transition: { duration: 1.1, repeat: Infinity, repeatDelay: 0.4 } },
};

function Hat({ hat, id }: { hat: HatId; id: string }) {
  switch (hat) {
    case 'flowercrown':
      return (
        <g>
          <path d="M52 44 Q100 22 148 44" stroke="#5f9f5a" strokeWidth="5" fill="none" strokeLinecap="round" />
          {[58, 76, 96, 116, 136].map((x, i) => (
            <g key={x} transform={`translate(${x} ${i % 2 ? 33 : 38})`}>
              {[0, 72, 144, 216, 288].map((r) => (
                <ellipse key={r} rx="4.6" ry="7" transform={`rotate(${r}) translate(0 -5)`} fill={['#f6a8c4', '#fff4c2', '#c7b2f2'][i % 3]} />
              ))}
              <circle r="3.4" fill="#f5c04a" />
            </g>
          ))}
        </g>
      );
    case 'beanie':
      return (
        <g>
          <path d="M54 52 Q58 6 100 6 Q142 6 146 52 Z" fill="#e0697a" />
          <path d="M60 36 Q100 26 140 36" stroke="#f39aa6" strokeWidth="4" fill="none" />
          <rect x="50" y="44" width="100" height="16" rx="8" fill="#c94e63" />
          <circle cx="100" cy="6" r="10" fill="#fff4f0" />
        </g>
      );
    case 'explorer':
      return (
        <g>
          <ellipse cx="100" cy="46" rx="62" ry="12" fill="#b98b4f" />
          <path d="M66 46 Q68 12 100 12 Q132 12 134 46 Z" fill="#d6a865" />
          <rect x="66" y="34" width="68" height="8" fill="#6d4a2a" />
        </g>
      );
    case 'wizard':
      return (
        <g>
          <path d="M64 48 L104 -26 L136 48 Z" fill={`url(#${id}-wiz)`} />
          <ellipse cx="100" cy="48" rx="46" ry="9" fill="#3d3a6b" />
          {[
            [96, 10],
            [112, 26],
            [88, 34],
          ].map(([x, y]) => (
            <path key={x} d={`M${x} ${y - 5} L${x + 1.5} ${y - 1.5} L${x + 5} ${y} L${x + 1.5} ${y + 1.5} L${x} ${y + 5} L${x - 1.5} ${y + 1.5} L${x - 5} ${y} L${x - 1.5} ${y - 1.5}Z`} fill="#ffe38a" />
          ))}
        </g>
      );
    case 'acorn':
      return (
        <g>
          <path d="M66 42 Q66 10 100 10 Q134 10 134 42 Z" fill="#9a6a3c" />
          <path d="M70 30 L130 30 M74 20 L126 20" stroke="#7a5230" strokeWidth="3" />
          <rect x="97" y="0" width="6" height="12" rx="3" fill="#6d4a2a" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M72 44 L74 14 L88 30 L100 8 L112 30 L126 14 L128 44 Z" fill="#f6c94c" stroke="#d9a02c" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="100" cy="34" r="4" fill="#e0697a" />
          <circle cx="84" cy="37" r="3" fill="#7fc3ea" />
          <circle cx="116" cy="37" r="3" fill="#7fc3ea" />
        </g>
      );
    case 'bow':
      return (
        <g transform="translate(136 34) rotate(18)">
          <path d="M0 0 L-16 -10 Q-20 0 -16 10 Z M0 0 L16 -10 Q20 0 16 10 Z" fill="#f27fa0" />
          <circle r="5" fill="#d85a80" />
        </g>
      );
    default:
      return null;
  }
}

/**
 * WAG's signature dog character — a chibi, hand-shaded SVG puppy whose coat,
 * ears, markings and outfit are personalised during onboarding.
 */
export function Dog({ look, pose = 'idle', size = 160, className, onClick, shadow = true, flip }: Props) {
  const raw = useId().replace(/:/g, '');
  const id = `dog${raw}`;
  const c = COATS[look.coat] ?? COATS.golden;
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 140);
        loop();
      }, 2200 + Math.random() * 2800);
    };
    loop();
    return () => window.clearTimeout(t);
  }, []);

  const closed = pose === 'sleep' || pose === 'happy' || pose === 'celebrate' || pose === 'excited' || blink;
  const tongue = pose === 'happy' || pose === 'excited' || pose === 'celebrate' || pose === 'idle' || pose === 'walk' || pose === 'spin';
  const sad = pose === 'sad';
  const earDown = sad || pose === 'sleep';
  const wagSpeed = pose === 'excited' || pose === 'celebrate' || pose === 'happy' ? 0.22 : sad || pose === 'sleep' ? 2.4 : 0.6;
  const dark = look.coat === 'black' || look.coat === 'chocolate';
  const eyeCol = '#2b2131';
  const markCol = look.coat === 'white' || look.coat === 'cream' ? '#c79a6b' : look.coat === 'black' ? '#f3ece4' : c.shade;

  return (
    <motion.svg
      viewBox="0 -30 200 230"
      width={size}
      height={(size * 230) / 200}
      className={className}
      onClick={onClick}
      style={{ overflow: 'visible', cursor: onClick ? 'pointer' : undefined, transform: flip ? 'scaleX(-1)' : undefined }}
      aria-label="Your dog"
    >
      <defs>
        <radialGradient id={`${id}-head`} cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor={c.light} stopOpacity={dark ? 0.25 : 0.7} />
          <stop offset="45%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.shade} />
        </radialGradient>
        <radialGradient id={`${id}-body`} cx="45%" cy="25%" r="80%">
          <stop offset="0%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.shade} />
        </radialGradient>
        <radialGradient id={`${id}-muzzle`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fffaf2" />
          <stop offset="100%" stopColor={c.light} />
        </radialGradient>
        <linearGradient id={`${id}-wiz`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8f78e0" />
          <stop offset="100%" stopColor="#4d3d9c" />
        </linearGradient>
        <radialGradient id={`${id}-eye`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5b4a63" />
          <stop offset="100%" stopColor={eyeCol} />
        </radialGradient>
      </defs>

      {shadow && <ellipse cx="100" cy="196" rx="58" ry="9" fill="#2b2140" opacity="0.18" />}

      <motion.g animate={BODY_ANIM[pose] ?? BODY_ANIM.idle} style={{ originX: '100px', originY: '190px', transformBox: 'view-box' }}>
        {/* tail */}
        <motion.path
          d="M140 160 Q176 150 172 116 Q170 104 162 108 Q164 136 136 148 Z"
          fill={c.base}
          animate={{ rotate: [-14, 16, -14] }}
          transition={{ duration: wagSpeed, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '138px', originY: '156px', transformBox: 'view-box' }}
        />
        {/* body */}
        <path d="M58 190 Q50 132 100 120 Q150 132 142 190 Z" fill={c.base} />
        <ellipse cx="66" cy="180" rx="20" ry="15" fill={c.shade} />
        <ellipse cx="134" cy="180" rx="20" ry="15" fill={c.shade} />
        {/* chest */}
        <path d="M80 134 Q100 128 120 134 Q118 172 100 178 Q82 172 80 134 Z" fill={dark ? '#efe4da' : c.light} opacity={look.pattern === 'blaze' || dark ? 1 : 0.85} />
        {/* front legs */}
        <motion.g
          animate={pose === 'wave' ? { rotate: [0, -70, -50, -70, 0] } : pose === 'walk' ? { y: [0, -4, 0] } : {}}
          transition={{ duration: pose === 'walk' ? 0.42 : 1.2, repeat: Infinity, repeatDelay: pose === 'wave' ? 0.4 : 0 }}
          style={{ originX: '84px', originY: '150px', transformBox: 'view-box' }}
        >
          <rect x="74" y="150" width="20" height="42" rx="10" fill={c.base} />
          <ellipse cx="84" cy="190" rx="13" ry="8" fill={look.pattern === 'socks' ? '#fffaf2' : c.light} />
        </motion.g>
        <motion.g animate={pose === 'walk' ? { y: [-4, 0, -4] } : {}} transition={{ duration: 0.42, repeat: Infinity }}>
          <rect x="106" y="150" width="20" height="42" rx="10" fill={c.base} />
          <ellipse cx="116" cy="190" rx="13" ry="8" fill={look.pattern === 'socks' ? '#fffaf2' : c.light} />
        </motion.g>
        {/* bandana */}
        <path d="M66 124 Q100 140 134 124 L130 134 Q100 168 70 134 Z" fill={look.bandana} />
        
        <g transform="translate(100 146)" fill="#fff" opacity="0.92">
          <ellipse cx="0" cy="3" rx="4.6" ry="3.8" />
          <circle cx="-5" cy="-2.5" r="1.8" />
          <circle cx="-1.8" cy="-5" r="1.8" />
          <circle cx="1.8" cy="-5" r="1.8" />
          <circle cx="5" cy="-2.5" r="1.8" />
        </g>

        {/* head group */}
        <motion.g
          animate={pose === 'perk' ? { rotate: [0, -10, -10, 0] } : pose === 'sniff' ? { y: [0, 4, 0] } : sad ? { y: 4, rotate: 0 } : { rotate: [0, 2, 0, -2, 0] }}
          transition={pose === 'perk' ? { duration: 1.6, repeat: Infinity, repeatDelay: 0.4 } : { duration: pose === 'sniff' ? 0.5 : 5, repeat: Infinity }}
          style={{ originX: '100px', originY: '120px', transformBox: 'view-box' }}
        >
          {/* ears (back) */}
          {look.ears === 'pointy' && (
            <g>
              <motion.g animate={{ rotate: earDown ? -28 : [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }} style={{ originX: '66px', originY: '50px', transformBox: 'view-box' }}>
                <path d="M50 58 Q44 8 58 2 Q80 20 86 40 Z" fill={c.shade} />
                <path d="M56 46 Q54 18 60 14 Q74 26 78 40 Z" fill="#f5b3b9" opacity="0.8" />
              </motion.g>
              <motion.g animate={{ rotate: earDown ? 28 : [0, 4, 0] }} transition={{ duration: 3, repeat: Infinity, delay: 0.3 }} style={{ originX: '134px', originY: '50px', transformBox: 'view-box' }}>
                <path d="M150 58 Q156 8 142 2 Q120 20 114 40 Z" fill={c.shade} />
                <path d="M144 46 Q146 18 140 14 Q126 26 122 40 Z" fill="#f5b3b9" opacity="0.8" />
              </motion.g>
            </g>
          )}
          {/* head */}
          <ellipse cx="100" cy="76" rx="58" ry="52" fill={c.base} />
          {/* fluffy cheeks */}
          <ellipse cx="54" cy="94" rx="14" ry="16" fill={c.base} />
          <ellipse cx="146" cy="94" rx="14" ry="16" fill={c.base} />
          {look.pattern === 'mask' && <path d="M48 70 Q60 40 100 46 Q140 40 152 70 Q146 92 124 88 Q100 72 76 88 Q54 92 48 70Z" fill={markCol} opacity="0.75" />}
          {look.pattern === 'patch' && <ellipse cx="76" cy="68" rx="20" ry="18" fill={markCol} opacity="0.9" />}
          {look.pattern === 'blaze' && <path d="M92 26 Q100 22 108 26 L114 80 Q100 88 86 80 Z" fill="#fffaf2" opacity="0.95" />}
          {/* highlight */}

          {/* floppy / folded ears (front) */}
          {look.ears === 'floppy' && (
            <>
              <motion.path
                d="M52 44 Q24 42 22 84 Q22 110 40 112 Q54 108 58 84 Q62 58 52 44 Z"
                fill={c.shade}
                animate={{ rotate: earDown ? 8 : [0, 5, 0] }}
                transition={{ duration: pose === 'excited' ? 0.4 : 3, repeat: Infinity }}
                style={{ originX: '54px', originY: '46px', transformBox: 'view-box' }}
              />
              <motion.path
                d="M148 44 Q176 42 178 84 Q178 110 160 112 Q146 108 142 84 Q138 58 148 44 Z"
                fill={c.shade}
                animate={{ rotate: earDown ? -8 : [0, -5, 0] }}
                transition={{ duration: pose === 'excited' ? 0.4 : 3, repeat: Infinity, delay: 0.2 }}
                style={{ originX: '146px', originY: '46px', transformBox: 'view-box' }}
              />
            </>
          )}
          {look.ears === 'fold' && (
            <>
              <motion.path d="M54 40 Q58 14 80 20 Q78 36 64 52 Q56 50 54 40Z" fill={c.shade} animate={{ rotate: earDown ? 20 : [0, -6, 0] }} transition={{ duration: 2.6, repeat: Infinity }} style={{ originX: '70px', originY: '30px', transformBox: 'view-box' }} />
              <motion.path d="M146 40 Q142 14 120 20 Q122 36 136 52 Q144 50 146 40Z" fill={c.shade} animate={{ rotate: earDown ? -20 : [0, 6, 0] }} transition={{ duration: 2.6, repeat: Infinity, delay: 0.3 }} style={{ originX: '130px', originY: '30px', transformBox: 'view-box' }} />
            </>
          )}

          {/* eyes */}
          {closed ? (
            <g stroke={eyeCol} strokeWidth="4.5" strokeLinecap="round" fill="none">
              {sad || pose === 'sleep' ? (
                <>
                  <path d="M64 74 Q74 80 84 74" />
                  <path d="M116 74 Q126 80 136 74" />
                </>
              ) : (
                <>
                  <path d="M62 76 Q73 62 84 76" />
                  <path d="M116 76 Q127 62 138 76" />
                </>
              )}
            </g>
          ) : (
            <g>
              <ellipse cx="74" cy="72" rx="10" ry={sad ? 10 : 12} fill={eyeCol} />
              <ellipse cx="126" cy="72" rx="10" ry={sad ? 10 : 12} fill={eyeCol} />
              <circle cx="77.5" cy="66.5" r="4" fill="#fff" />
              <circle cx="129.5" cy="66.5" r="4" fill="#fff" />
              <circle cx="71" cy="77" r="1.8" fill="#fff" opacity="0.8" />
              <circle cx="123" cy="77" r="1.8" fill="#fff" opacity="0.8" />
              {sad && (
                <g stroke={eyeCol} strokeWidth="3" strokeLinecap="round">
                  <path d="M62 56 L80 60" />
                  <path d="M138 56 L120 60" />
                </g>
              )}
            </g>
          )}
          {/* brows */}
          {!sad && !closed && (
            <g fill={c.shade} opacity="0.7">
              <ellipse cx="72" cy="52" rx="6" ry="3.4" />
              <ellipse cx="128" cy="52" rx="6" ry="3.4" />
            </g>
          )}
          {/* blush */}
          <ellipse cx="58" cy="92" rx="10" ry="6" fill="#f58ea0" opacity="0.6" />
          <ellipse cx="142" cy="92" rx="10" ry="6" fill="#f58ea0" opacity="0.6" />
          {/* muzzle */}
          <ellipse cx="100" cy="98" rx="30" ry="22" fill={dark ? '#efe4da' : c.light} />
          <path d="M88 84 Q100 78 112 84 Q112 94 100 97 Q88 94 88 84Z" fill="#3a2a35" />
          <ellipse cx="96" cy="84" rx="4.5" ry="2.4" fill="#fff" opacity="0.6" />
          <path d="M100 97 L100 103" stroke="#3a2a35" strokeWidth="3" strokeLinecap="round" />
          {sad ? (
            <path d="M88 112 Q100 104 112 112" stroke="#3a2a35" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M84 102 Q92 112 100 103 Q108 112 116 102" stroke="#3a2a35" strokeWidth="3" fill="none" strokeLinecap="round" />
          )}
          {tongue && !sad && (
            <motion.g
              animate={pose === 'excited' || pose === 'celebrate' ? { scaleY: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3, repeat: Infinity }}
              style={{ originX: '100px', originY: '106px', transformBox: 'view-box' }}
            >
              <path d="M91 106 Q91 124 100 124 Q109 124 109 106 Q100 110 91 106Z" fill="#f07c8c" />
              <path d="M100 109 L100 120" stroke="#d45a6f" strokeWidth="1.6" strokeLinecap="round" />
            </motion.g>
          )}
          <Hat hat={look.hat} id={id} />
        </motion.g>
        {pose === 'sleep' && (
          <motion.g animate={{ y: [0, -14], opacity: [0, 1, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
            <text x="150" y="30" fontFamily="Fredoka Variable, sans-serif" fontSize="22" fontWeight="600" fill="#7b62c4">
              z
            </text>
            <text x="164" y="14" fontFamily="Fredoka Variable, sans-serif" fontSize="16" fontWeight="600" fill="#7b62c4">
              z
            </text>
          </motion.g>
        )}
      </motion.g>
    </motion.svg>
  );
}
