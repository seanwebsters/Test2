"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useState } from "react";
import type { Mood } from "@/content/types";
import { useStore } from "@/lib/store";

type Equipped = { head?: string; face?: string; neck?: string };

interface Props {
  size?: number;
  mood?: Mood;
  /** Wave the arm. */
  wave?: boolean;
  /** Gentle idle float. */
  float?: boolean;
  /** Override accessories (otherwise uses the learner's equipped items). */
  equipped?: Equipped;
  /** Hide accessories entirely. */
  bare?: boolean;
  sparkles?: boolean;
  className?: string;
}

/**
 * Aibi — a soft, glossy 3D-style robot drawn in SVG so it scales crisply,
 * animates cheaply and can wear unlockable accessories.
 */
export default function Mascot({ size = 160, mood = "happy", wave = false, float = true, equipped, bare, sparkles, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const stored = useStore((s) => s.equipped);
  const eq = bare ? {} : equipped ?? stored;
  const reduce = useReducedMotion();
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduce) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loop();
      }, 2600 + Math.random() * 2600);
    };
    loop();
    return () => clearTimeout(t);
  }, [reduce]);

  const g = (n: string) => `${n}-${uid}`;

  return (
    <motion.div
      className={className}
      style={{ width: size, height: size * 1.1 }}
      animate={float && !reduce ? { y: [0, -6, 0] } : undefined}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      <svg viewBox="0 0 200 220" width="100%" height="100%" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id={g("body")} cx="38%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#F1ECFF" />
            <stop offset="100%" stopColor="#C9B8FF" />
          </radialGradient>
          <radialGradient id={g("purple")} cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#B79BFF" />
            <stop offset="60%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6233D6" />
          </radialGradient>
          <linearGradient id={g("visor")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B2A6B" />
            <stop offset="100%" stopColor="#140C2E" />
          </linearGradient>
          <radialGradient id={g("glow")} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E9DDFF" />
            <stop offset="100%" stopColor="#B69CFF" />
          </radialGradient>
          <radialGradient id={g("shadow")} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4C2CB0" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#4C2CB0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={g("gold")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE58A" />
            <stop offset="100%" stopColor="#F5A70B" />
          </linearGradient>
        </defs>

        {/* ground shadow */}
        <ellipse cx="100" cy="210" rx="56" ry="8" fill={`url(#${g("shadow")})`} />

        {/* neck accessory behind body? no — body first */}
        {/* legs */}
        <rect x="70" y="178" width="24" height="26" rx="12" fill={`url(#${g("body")})`} />
        <rect x="106" y="178" width="24" height="26" rx="12" fill={`url(#${g("body")})`} />
        <ellipse cx="82" cy="203" rx="15" ry="7" fill={`url(#${g("purple")})`} />
        <ellipse cx="118" cy="203" rx="15" ry="7" fill={`url(#${g("purple")})`} />

        {/* left arm (static) */}
        <motion.g
          style={{ originX: 0.85, originY: 0.08 }}
          animate={mood === "cheer" && !reduce ? { rotate: [0, -25, 0] } : { rotate: 0 }}
          transition={{ duration: 0.7, repeat: mood === "cheer" ? Infinity : 0, ease: "easeInOut" }}
        >
          <rect x="34" y="132" width="26" height="44" rx="13" fill={`url(#${g("body")})`} transform="rotate(18 47 150)" />
          <circle cx="40" cy="176" r="11" fill={`url(#${g("purple")})`} />
        </motion.g>

        {/* body */}
        <rect x="56" y="122" width="88" height="70" rx="32" fill={`url(#${g("body")})`} />
        <path d="M86 168 L100 148 L114 168" fill="none" stroke={`url(#${g("purple")})`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />

        {/* right arm (waves) */}
        <motion.g
          style={{ originX: 0.15, originY: 0.08 }}
          animate={(wave || mood === "cheer") && !reduce ? { rotate: [0, -150, -120, -150, -120, 0] } : { rotate: 0 }}
          transition={{ duration: 2.2, repeat: wave || mood === "cheer" ? Infinity : 0, repeatDelay: 0.8, ease: "easeInOut" }}
        >
          <rect x="140" y="132" width="26" height="44" rx="13" fill={`url(#${g("body")})`} transform="rotate(-18 153 150)" />
          <circle cx="160" cy="176" r="11" fill={`url(#${g("purple")})`} />
        </motion.g>

        {/* neck accessories */}
        {eq.neck === "bowtie" && (
          <g transform="translate(100 126)">
            <path d="M0 0 L-18 -10 L-18 10 Z" fill="#F5564A" />
            <path d="M0 0 L18 -10 L18 10 Z" fill="#F5564A" />
            <circle r="5" fill="#D93D32" />
          </g>
        )}
        {eq.neck === "scarf" && (
          <g>
            <path d="M62 122 Q100 138 138 122 L138 132 Q100 148 62 132 Z" fill="#FF6FB5" />
            <rect x="112" y="128" width="14" height="32" rx="6" fill="#F0479A" transform="rotate(-8 119 144)" />
            <path d="M68 125 L68 133 M80 128 L80 137 M92 130 L92 139 M108 130 L108 139 M120 128 L120 136 M132 125 L132 133" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
          </g>
        )}
        {eq.neck === "medal" && (
          <g>
            <path d="M84 122 L100 150 L116 122" fill="none" stroke="#2696F0" strokeWidth="7" />
            <circle cx="100" cy="156" r="11" fill={`url(#${g("gold")})`} stroke="#F5A70B" strokeWidth="2" />
            <path d="M100 150 l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="#fff" fillOpacity="0.85" />
          </g>
        )}

        {/* head */}
        <g>
          {/* ear pods */}
          <ellipse cx="34" cy="78" rx="14" ry="20" fill={`url(#${g("purple")})`} />
          <ellipse cx="166" cy="78" rx="14" ry="20" fill={`url(#${g("purple")})`} />
          {/* antenna */}
          <rect x="97" y="12" width="6" height="18" rx="3" fill="#C9B8FF" />
          <motion.circle
            cx="100"
            cy="12"
            r="9"
            fill={`url(#${g("purple")})`}
            animate={!reduce ? { scale: [1, 1.15, 1] } : undefined}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ originX: 0.5, originY: 0.5 }}
          />
          <rect x="36" y="26" width="128" height="104" rx="48" fill={`url(#${g("body")})`} />
          {/* visor */}
          <rect x="50" y="44" width="100" height="70" rx="34" fill={`url(#${g("visor")})`} />
          <ellipse cx="78" cy="56" rx="18" ry="6" fill="#fff" opacity="0.14" />
          {/* face */}
          <Face mood={mood} blink={blink} glow={`url(#${g("glow")})`} />
          {/* gloss */}
          <ellipse cx="72" cy="38" rx="20" ry="7" fill="#fff" opacity="0.9" />
        </g>

        {/* face accessories */}
        {eq.face === "glasses" && (
          <g fill="none" stroke="#F5A70B" strokeWidth="4">
            <circle cx="78" cy="80" r="16" />
            <circle cx="122" cy="80" r="16" />
            <path d="M94 80 L106 80" />
          </g>
        )}
        {eq.face === "sunglasses" && (
          <g>
            <path d="M58 70 h36 v8 q0 16 -18 16 q-18 0 -18 -16 z" fill="#111" />
            <path d="M106 70 h36 v8 q0 16 -18 16 q-18 0 -18 -16 z" fill="#111" />
            <path d="M94 74 h12" stroke="#111" strokeWidth="4" />
            <path d="M64 74 l10 0" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
            <path d="M112 74 l10 0" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {/* head accessories */}
        {eq.head === "party-hat" && (
          <g transform="rotate(14 130 30)">
            <path d="M112 34 L132 -12 L152 34 Z" fill="#4FB2FF" />
            <path d="M118 20 L146 20 M122 8 L142 8" stroke="#FFC53D" strokeWidth="5" />
            <circle cx="132" cy="-14" r="7" fill="#FF6FB5" />
          </g>
        )}
        {eq.head === "headphones" && (
          <g>
            <path d="M38 70 Q38 14 100 14 Q162 14 162 70" fill="none" stroke="#2E1870" strokeWidth="9" strokeLinecap="round" />
            <rect x="22" y="58" width="24" height="40" rx="11" fill="#F5564A" />
            <rect x="154" y="58" width="24" height="40" rx="11" fill="#F5564A" />
          </g>
        )}
        {eq.head === "flower" && (
          <g transform="translate(140 34)">
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <ellipse key={a} cx="0" cy="-11" rx="6.5" ry="11" fill="#fff" stroke="#F1ECFF" transform={`rotate(${a})`} />
            ))}
            <circle r="7" fill="#FFC53D" />
          </g>
        )}
        {eq.head === "grad-cap" && (
          <g>
            <path d="M100 0 L160 20 L100 40 L40 20 Z" fill="#1E1538" />
            <path d="M70 30 L70 44 Q100 58 130 44 L130 30" fill="#2E1870" />
            <path d="M156 21 L156 46" stroke="#FFC53D" strokeWidth="3" />
            <circle cx="156" cy="49" r="5" fill="#FFC53D" />
          </g>
        )}
        {eq.head === "crown" && (
          <g>
            <path d="M62 34 L66 2 L84 20 L100 -4 L116 20 L134 2 L138 34 Z" fill={`url(#${g("gold")})`} stroke="#E39A08" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="100" cy="22" r="5" fill="#F5564A" />
            <circle cx="78" cy="26" r="4" fill="#4FB2FF" />
            <circle cx="122" cy="26" r="4" fill="#2DBE63" />
          </g>
        )}
        {eq.head === "beanie" && (
          <g>
            <path d="M42 50 Q42 -2 100 -2 Q158 -2 158 50 Z" fill="#7C4DFF" />
            <rect x="38" y="40" width="124" height="18" rx="9" fill="#5726CC" />
            <circle cx="100" cy="-6" r="10" fill="#FFC53D" />
          </g>
        )}
        {eq.head === "wizard" && (
          <g transform="rotate(-8 100 30)">
            <path d="M48 40 L104 -40 L152 40 Z" fill="#2E1870" />
            <ellipse cx="100" cy="40" rx="64" ry="10" fill="#43209C" />
            <path d="M90 6 l3 6 6 .8-4.5 4.2 1.2 6-5.7-3-5.7 3 1.2-6L76 12.8l6-.8z" fill="#FFC53D" />
            <circle cx="116" cy="-8" r="3" fill="#FFC53D" />
          </g>
        )}

        {sparkles && (
          <g>
            <motion.path d="M176 40 l4 -14 M184 50 l12 -8 M186 64 l14 0" stroke="#FFC53D" strokeWidth="6" strokeLinecap="round"
              animate={!reduce ? { opacity: [0.3, 1, 0.3] } : undefined} transition={{ duration: 1.2, repeat: Infinity }} />
          </g>
        )}
      </svg>
    </motion.div>
  );
}

function Face({ mood, blink, glow }: { mood: Mood; blink: boolean; glow: string }) {
  const eyeStroke = { stroke: glow, strokeWidth: 7, strokeLinecap: "round" as const, fill: "none" };
  if (blink && mood !== "wink") {
    return (
      <g>
        <path d="M66 80 L88 80" {...eyeStroke} />
        <path d="M112 80 L134 80" {...eyeStroke} />
        <Mouth mood={mood} glow={glow} />
      </g>
    );
  }
  switch (mood) {
    case "wow":
      return (
        <g>
          <ellipse cx="77" cy="78" rx="9" ry="11" fill={glow} />
          <ellipse cx="123" cy="78" rx="9" ry="11" fill={glow} />
          <ellipse cx="100" cy="100" rx="7" ry="8" fill={glow} />
        </g>
      );
    case "thinking":
      return (
        <g>
          <path d="M66 82 Q77 74 88 82" {...eyeStroke} />
          <circle cx="123" cy="78" r="8" fill={glow} />
          <path d="M90 102 Q102 98 112 102" {...eyeStroke} strokeWidth={5} />
        </g>
      );
    case "wink":
      return (
        <g>
          <path d="M66 84 Q77 70 88 84" {...eyeStroke} />
          <path d="M112 80 L134 80" {...eyeStroke} />
          <Mouth mood="happy" glow={glow} />
        </g>
      );
    case "oops":
      return (
        <g>
          <path d="M68 74 L86 84 M68 84 L86 74" {...eyeStroke} strokeWidth={5} />
          <path d="M114 74 L132 84 M114 84 L132 74" {...eyeStroke} strokeWidth={5} />
          <path d="M88 104 Q100 96 112 104" {...eyeStroke} strokeWidth={5} />
        </g>
      );
    case "cheer":
      return (
        <g>
          <path d="M66 84 Q77 68 88 84" {...eyeStroke} />
          <path d="M112 84 Q123 68 134 84" {...eyeStroke} />
          <path d="M84 96 Q100 116 116 96 Z" fill={glow} />
        </g>
      );
    default:
      return (
        <g>
          <path d="M66 84 Q77 70 88 84" {...eyeStroke} />
          <path d="M112 84 Q123 70 134 84" {...eyeStroke} />
          <Mouth mood={mood} glow={glow} />
        </g>
      );
  }
}

function Mouth({ mood, glow }: { mood: Mood; glow: string }) {
  if (mood === "oops") return null;
  return <path d="M90 98 Q100 108 110 98" stroke={glow} strokeWidth={5} strokeLinecap="round" fill="none" />;
}
