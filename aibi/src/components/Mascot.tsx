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
          <filter id={g("eyeglow")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
          <linearGradient id={g("gold")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE58A" />
            <stop offset="100%" stopColor="#F5A70B" />
          </linearGradient>
        </defs>

        {/* hover shadow + soft lift glow (Aibi floats instead of walking) */}
        <motion.ellipse
          cx="100" cy="210" rx="44" ry="7" fill={`url(#${g("shadow")})`}
          animate={float && !reduce ? { rx: [44, 36, 44], opacity: [1, 0.7, 1] } : undefined}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <ellipse cx="100" cy="195" rx="16" ry="6" fill="#FFD66B" opacity="0.55" filter={`url(#${g("eyeglow")})`} />

        {/* bean body */}
        <path d="M66 140 Q66 124 100 124 Q134 124 134 140 Q136 182 100 194 Q64 182 66 140Z" fill={`url(#${g("body")})`} />
        <path d="M74 136 Q80 128 96 128" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.8" />
        {/* chest badge: three "typing" dots, Aibi's signature */}
        <rect x="80" y="148" width="40" height="20" rx="10" fill={`url(#${g("purple")})`} />
        {[90, 100, 110].map((cx, i) => (
          <motion.circle key={cx} cx={cx} cy="158" r="3.2" fill="#fff"
            animate={!reduce ? { opacity: [0.35, 1, 0.35] } : undefined}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}

        {/* floating mitten hands */}
        <motion.g
          animate={mood === "cheer" && !reduce ? { x: [0, -10, 0], y: [0, -52, 0] } : float && !reduce ? { y: [0, 3, 0] } : undefined}
          transition={{ duration: mood === "cheer" ? 0.8 : 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="48" cy="160" rx="13" ry="14" fill={`url(#${g("purple")})`} />
          <circle cx="57" cy="152" r="5.5" fill={`url(#${g("purple")})`} />
          <ellipse cx="44" cy="155" rx="4" ry="3" fill="#fff" opacity="0.4" />
        </motion.g>
        <motion.g
          style={{ originX: 0.5, originY: 0.5 }}
          animate={
            (wave || mood === "cheer") && !reduce
              ? { x: [0, 16, 16, 16, 16, 0], y: [0, -58, -58, -58, -58, 0], rotate: [0, -12, 14, -12, 14, 0] }
              : float && !reduce ? { y: [0, 3, 0] } : undefined
          }
          transition={{ duration: wave || mood === "cheer" ? 2.4 : 2.6, repeat: Infinity, repeatDelay: wave ? 0.8 : 0, ease: "easeInOut" }}
        >
          <ellipse cx="152" cy="160" rx="13" ry="14" fill={`url(#${g("purple")})`} />
          <circle cx="143" cy="152" r="5.5" fill={`url(#${g("purple")})`} />
          <ellipse cx="148" cy="155" rx="4" ry="3" fill="#fff" opacity="0.4" />
        </motion.g>

        {/* head: a speech bubble, because Aibi is all about talking to AI */}
        <g>
          {/* sparkle antenna */}
          <path d="M100 28 Q100 16 110 10" stroke="#C9B8FF" strokeWidth="5" strokeLinecap="round" fill="none" />
          <motion.g
            style={{ originX: 0.5, originY: 0.5 }}
            animate={!reduce ? { scale: [1, 1.25, 1], rotate: [0, 45, 0] } : undefined}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M112 -6 Q114 4 124 6 Q114 8 112 18 Q110 8 100 6 Q110 4 112 -6Z" fill={`url(#${g("gold")})`} stroke="#F5A70B" strokeWidth="1.2" strokeLinejoin="round" />
          </motion.g>
          {/* side speaker dots */}
          <circle cx="33" cy="78" r="8" fill={`url(#${g("purple")})`} />
          <circle cx="167" cy="78" r="8" fill={`url(#${g("purple")})`} />
          <path
            d="M80 26 H120 A46 46 0 0 1 166 72 V80 A46 46 0 0 1 120 126 H90 L54 146 L64 118 A46 46 0 0 1 34 80 V72 A46 46 0 0 1 80 26Z"
            fill={`url(#${g("body")})`}
            strokeLinejoin="round"
          />
          {/* screen */}
          <rect x="48" y="42" width="104" height="70" rx="30" fill={`url(#${g("visor")})`} />
          <rect x="50" y="44" width="100" height="66" rx="28" fill="none" stroke="#B69CFF" strokeOpacity="0.35" strokeWidth="1.5" />
          <ellipse cx="76" cy="54" rx="18" ry="5" fill="#fff" opacity="0.14" />
          {/* blush */}
          <ellipse cx="62" cy="98" rx="8" ry="4.5" fill="#FF8DC4" opacity="0.5" />
          <ellipse cx="138" cy="98" rx="8" ry="4.5" fill="#FF8DC4" opacity="0.5" />
          {/* face */}
          <g filter={`url(#${g("eyeglow")})`} opacity="0.85">
            <Face mood={mood} blink={blink} glow="#B69CFF" />
          </g>
          <Face mood={mood} blink={blink} glow={`url(#${g("glow")})`} />
          {/* gloss */}
          <ellipse cx="74" cy="34" rx="20" ry="6" fill="#fff" opacity="0.9" />
        </g>

        {/* neck accessories */}
        {eq.neck === "bowtie" && (
          <g transform="translate(100 134)">
            <path d="M0 0 L-18 -10 L-18 10 Z" fill="#F5564A" />
            <path d="M0 0 L18 -10 L18 10 Z" fill="#F5564A" />
            <circle r="5" fill="#D93D32" />
          </g>
        )}
        {eq.neck === "scarf" && (
          <g>
            <path d="M66 128 Q100 142 134 128 L134 138 Q100 152 66 138 Z" fill="#FF6FB5" />
            <rect x="112" y="134" width="14" height="32" rx="6" fill="#F0479A" transform="rotate(-8 119 144)" />
            <path d="M72 131 L72 139 M84 134 L84 143 M96 136 L96 145 M108 136 L108 145 M120 134 L120 142 M130 131 L130 139" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
          </g>
        )}
        {eq.neck === "medal" && (
          <g>
            <path d="M84 122 L100 150 L116 122" fill="none" stroke="#2696F0" strokeWidth="7" />
            <circle cx="100" cy="156" r="11" fill={`url(#${g("gold")})`} stroke="#F5A70B" strokeWidth="2" />
            <path d="M100 150 l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="#fff" fillOpacity="0.85" />
          </g>
        )}

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
