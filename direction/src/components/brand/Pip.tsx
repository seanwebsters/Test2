"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

export type PipMood = "happy" | "excited" | "thinking" | "proud" | "curious" | "wave" | "sleepy" | "gentle";

interface PipProps {
  mood?: PipMood;
  size?: number;
  className?: string;
  /** Idle bobbing animation. */
  animate?: boolean;
  title?: string;
}

/**
 * Pip — Direction's companion. A small, round explorer with a sprout on its
 * head and a compass it never puts down. Curious, warm, quietly brave.
 *
 * Illustration system:
 * - Body: mint→teal gradient pebble, soft belly patch.
 * - Sprout: two leaves; grows a third when proud/excited.
 * - Compass: brass ring, coral needle. Spins when thinking.
 * - Expressions are drawn only with eyes, brows, mouth and cheeks.
 */
export function Pip({ mood = "happy", size = 120, className, animate = true, title }: PipProps) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const bob = animate && !reduce;

  const eyes = (() => {
    switch (mood) {
      case "proud":
      case "excited":
        return (
          <g stroke="#0E1B3D" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M44 63 q6 -7 12 0" />
            <path d="M68 63 q6 -7 12 0" />
          </g>
        );
      case "sleepy":
        return (
          <g stroke="#0E1B3D" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M44 64 q6 4 12 0" />
            <path d="M68 64 q6 4 12 0" />
          </g>
        );
      case "thinking":
        return (
          <g fill="#0E1B3D">
            <ellipse cx="51" cy="60" rx="5.5" ry="7" />
            <ellipse cx="75" cy="60" rx="5.5" ry="7" />
            <circle cx="53" cy="56.5" r="2" fill="#fff" />
            <circle cx="77" cy="56.5" r="2" fill="#fff" />
          </g>
        );
      default:
        return (
          <g fill="#0E1B3D">
            <ellipse cx="50" cy="63" rx="6" ry="7.5" />
            <ellipse cx="74" cy="63" rx="6" ry="7.5" />
            <circle cx="52.5" cy="60" r="2.3" fill="#fff" />
            <circle cx="76.5" cy="60" r="2.3" fill="#fff" />
          </g>
        );
    }
  })();

  const brows =
    mood === "curious" ? (
      <g stroke="#0E1B3D" strokeWidth="3" strokeLinecap="round">
        <path d="M43 50 l12 -3" />
        <path d="M69 49 l11 1" />
      </g>
    ) : mood === "gentle" ? (
      <g stroke="#0E1B3D" strokeWidth="3" strokeLinecap="round">
        <path d="M44 53 l11 -3" />
        <path d="M69 50 l11 3" />
      </g>
    ) : mood === "thinking" ? (
      <g stroke="#0E1B3D" strokeWidth="3" strokeLinecap="round">
        <path d="M44 49 q6 -3 12 0" />
        <path d="M69 47 q6 -4 12 1" />
      </g>
    ) : null;

  const mouth = (() => {
    switch (mood) {
      case "excited":
        return <path d="M53 75 q9 12 18 0 z" fill="#0E1B3D" />;
      case "wave":
      case "happy":
      case "proud":
        return <path d="M54 75 q8 8 16 0" stroke="#0E1B3D" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
      case "thinking":
        return <path d="M57 78 h10" stroke="#0E1B3D" strokeWidth="3.5" strokeLinecap="round" />;
      case "sleepy":
        return <ellipse cx="62" cy="78" rx="3.5" ry="4" fill="#0E1B3D" />;
      case "gentle":
        return <path d="M55 79 q7 -4 14 0" stroke="#0E1B3D" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
      default:
        return <path d="M56 76 q6 5 12 0" stroke="#0E1B3D" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    }
  })();

  const leafExtra = mood === "proud" || mood === "excited";

  return (
    <motion.svg
      viewBox="0 0 124 132"
      width={size}
      height={(size * 132) / 124}
      className={className}
      role="img"
      aria-label={title ?? `Pip the Direction companion, looking ${mood}`}
      animate={bob ? { y: mood === "excited" ? [0, -8, 0] : [0, -4, 0] } : undefined}
      transition={bob ? { duration: mood === "excited" ? 0.9 : 3.6, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      <defs>
        <linearGradient id={`body-${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#9DF3D6" />
          <stop offset="0.55" stopColor="#2FC9B4" />
          <stop offset="1" stopColor="#0B9A8C" />
        </linearGradient>
        <radialGradient id={`belly-${id}`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#F4FFF9" stopOpacity="0.95" />
          <stop offset="1" stopColor="#D8FBEE" stopOpacity="0.6" />
        </radialGradient>
        <linearGradient id={`brass-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE08A" />
          <stop offset="1" stopColor="#E8A93A" />
        </linearGradient>
      </defs>

      {/* shadow */}
      <ellipse cx="62" cy="126" rx="30" ry="5" fill="#0E1B3D" opacity="0.12" />

      {/* sprout */}
      <g>
        <path d="M62 30 q-1 -10 2 -16" stroke="#0B9A8C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M63 17 q-16 -10 -22 2 q10 8 22 -2 z" fill="#5EDBA9" />
        <path d="M64 15 q14 -12 22 -1 q-10 9 -22 1 z" fill="#7EE7C4" />
        {leafExtra && <path d="M63 22 q2 -14 12 -18 q2 12 -12 18 z" fill="#FFD66B" />}
      </g>

      {/* body */}
      <path d="M62 28 C 92 28 106 54 106 82 C 106 108 88 122 62 122 C 36 122 18 108 18 82 C 18 54 32 28 62 28 Z" fill={`url(#body-${id})`} />
      <ellipse cx="62" cy="94" rx="27" ry="22" fill={`url(#belly-${id})`} />

      {/* cheeks */}
      <ellipse cx="38" cy="74" rx="6" ry="4" fill="#FF7A68" opacity={mood === "sleepy" ? 0.25 : 0.45} />
      <ellipse cx="86" cy="74" rx="6" ry="4" fill="#FF7A68" opacity={mood === "sleepy" ? 0.25 : 0.45} />

      {brows}
      {eyes}
      {mouth}

      {/* arms + compass */}
      {mood === "wave" ? (
        <motion.path
          d="M100 74 q16 -8 14 -26"
          stroke="#18B3A0"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          style={{ originX: "100px", originY: "74px" }}
          animate={bob ? { rotate: [0, -14, 0, -14, 0] } : undefined}
          transition={bob ? { duration: 1.6, repeat: Infinity, repeatDelay: 1.2 } : undefined}
        />
      ) : (
        <path d="M100 88 q8 6 2 14" stroke="#18B3A0" strokeWidth="9" strokeLinecap="round" fill="none" />
      )}
      <path d={mood === "thinking" ? "M26 92 q14 -6 24 -8" : "M24 88 q4 14 18 16"} stroke="#18B3A0" strokeWidth="9" strokeLinecap="round" fill="none" />
      <g transform={mood === "thinking" ? "translate(36 90)" : "translate(40 104)"}>
        <circle r="12" fill={`url(#brass-${id})`} stroke="#B87B1E" strokeWidth="1.5" />
        <circle r="8.5" fill="#FFF8E6" />
        <motion.g
          animate={bob && mood === "thinking" ? { rotate: [0, 40, -20, 0] } : undefined}
          transition={bob ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
        >
          <path d="M0 -7 L2.4 0 L0 7 L-2.4 0 Z" fill="#FF7A68" />
          <path d="M0 0 L2.4 0 L0 7 L-2.4 0 Z" fill="#0E1B3D" opacity="0.8" />
        </motion.g>
      </g>

      {/* sparkles for celebration moods */}
      {(mood === "excited" || mood === "proud") && (
        <g fill="#FFD66B">
          <path d="M12 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" />
          <path d="M108 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
        </g>
      )}
      {mood === "sleepy" && (
        <text x="92" y="36" fontFamily="sans-serif" fontWeight="700" fontSize="14" fill="#8089A5">
          z
        </text>
      )}
    </motion.svg>
  );
}
