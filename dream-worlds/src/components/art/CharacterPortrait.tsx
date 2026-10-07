"use client";

/**
 * Backlit character portrait. Characters are rendered as cinematic
 * silhouettes rim-lit against their world — evocative without depicting any
 * real or licensed likeness. Partners can supply `portrait.assetUrl` instead.
 */
import { memo, useId } from "react";
import type { Character } from "@/lib/types";
import { worldById } from "@/lib/data/worlds";
import { WorldArt, blend } from "./WorldArt";
import { CHARACTER_ART } from "@/lib/artAssets";

export const CharacterPortrait = memo(function CharacterPortrait({ character, className = "", showWorld = true, avatar = false }: { character: Character; className?: string; showWorld?: boolean; avatar?: boolean }) {
  const world = worldById(character.worldId)!;
  const src = character.portrait.assetUrl ?? CHARACTER_ART[character.id];
  if (src)
    return (
      <div className={`${/\babsolute\b/.test(className) ? "" : "relative"} overflow-hidden bg-night-950 ${className}`} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          className="absolute inset-0 h-full w-full select-none object-cover"
          // avatars crop in on head and shoulders
          style={avatar ? { objectPosition: "50% 42%", transform: "scale(1.9)", transformOrigin: "50% 52%" } : { objectPosition: "50% 30%" }}
        />
      </div>
    );
  return <VectorPortrait character={character} className={className} showWorld={showWorld} />;
});

const VectorPortrait = memo(function VectorPortrait({ character, className = "", showWorld = true }: { character: Character; className?: string; showWorld?: boolean }) {
  const world = worldById(character.worldId)!;
  const raw = "u" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (n: string) => `${raw}-${n}`;
  const { hue, accent, silhouette } = character.portrait;
  const dark = blend(world.visualStyle.palette[0], "#000000", 0.2);

  return (
    <div className={`${/\babsolute\b/.test(className) ? "" : "relative"} overflow-hidden ${className}`} aria-hidden>
      {showWorld && <WorldArt scene={world.visualStyle.scene} palette={world.visualStyle.palette} seed={character.id} className="absolute inset-0 scale-125 opacity-80" />}
      <svg viewBox="0 0 200 240" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={id("back")} cx="0.5" cy="0.42" r="0.5">
            <stop offset="0" stopColor={hue} stopOpacity="0.85" />
            <stop offset="0.45" stopColor={hue} stopOpacity="0.25" />
            <stop offset="1" stopColor={hue} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id("body")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={blend(dark, hue, 0.28)} />
            <stop offset="0.35" stopColor={dark} />
            <stop offset="1" stopColor={blend(dark, accent, 0.12)} />
          </linearGradient>
          <linearGradient id={id("fade")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#04060f" stopOpacity="0.85" />
          </linearGradient>
          <filter id={id("rim")} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>
        <ellipse cx="100" cy="100" rx="95" ry="105" fill={`url(#${id("back")})`} />
        <g>
          {/* rim light pass */}
          <g fill="none" stroke={hue} strokeWidth="3" opacity="0.75" filter={`url(#${id("rim")})`}>
            <Figure kind={silhouette} />
          </g>
          <g fill={`url(#${id("body")})`}>
            <Figure kind={silhouette} />
          </g>
          <Details kind={silhouette} hue={hue} accent={accent} />
        </g>
        <rect width="200" height="240" fill={`url(#${id("fade")})`} />
      </svg>
    </div>
  );
});

function Figure({ kind }: { kind: Character["portrait"]["silhouette"] }) {
  if (kind === "creature")
    return (
      <g>
        <path d="M30 240 C30 150 60 96 100 96 C140 96 170 150 170 240 Z" />
        <ellipse cx="100" cy="112" rx="44" ry="40" />
      </g>
    );
  const shoulders = <path d="M18 240 C22 186 54 168 82 160 L118 160 C146 168 178 186 182 240 Z" />;
  const neck = <rect x="88" y="128" width="24" height="36" rx="6" />;
  const head = kind === "builder" ? <rect x="70" y="66" width="60" height="68" rx="12" /> : <ellipse cx="100" cy="100" rx="29" ry="35" />;
  const hat = (() => {
    switch (kind) {
      case "captain":
        return <path d="M52 78 C70 60 84 70 100 54 C116 70 130 60 148 78 C130 74 116 80 100 76 C84 80 70 74 52 78 Z" />;
      case "admiral":
        return <g><path d="M66 74 C66 50 134 50 134 74 Z" /><rect x="62" y="72" width="76" height="8" rx="3" /><rect x="22" y="174" width="36" height="10" rx="5" /><rect x="142" y="174" width="36" height="10" rx="5" /></g>;
      case "witch":
        return <g><path d="M48 82 C70 74 130 74 152 82 C130 90 70 90 48 82 Z" /><path d="M72 80 L110 14 C114 10 118 14 116 20 L128 80 Z" /></g>;
      case "knight":
        return <g><path d="M68 104 C66 60 134 60 132 104 L132 128 L68 128 Z" /><path d="M100 64 C112 40 140 36 150 44 C130 46 118 56 110 66 Z" /></g>;
      case "builder":
        return <path d="M64 70 C64 46 136 46 136 70 L142 72 L58 72 Z" />;
      case "keeper":
        return <path d="M58 150 C50 100 62 58 100 54 C138 58 150 100 142 150 C130 132 124 104 100 98 C76 104 70 132 58 150 Z" />;
      case "pilot":
        return <g><path d="M70 92 C70 56 130 56 130 92 C120 72 80 72 70 92 Z" /><path d="M60 168 C80 150 120 150 140 168 C120 178 80 178 60 168 Z" /></g>;
      case "royal":
        return <path d="M70 70 L74 46 L86 60 L100 40 L114 60 L126 46 L130 70 Z" />;
      case "conductor":
        return <g><path d="M68 76 C68 56 132 56 132 76 Z" /><path d="M66 74 L142 74 C140 82 120 84 100 82 C84 82 70 80 66 74 Z" /></g>;
      case "gardener":
        return <g><ellipse cx="100" cy="76" rx="58" ry="10" /><path d="M74 76 C76 54 124 54 126 76 Z" /></g>;
      case "scholar":
        return <path d="M60 170 L82 152 L100 176 L118 152 L140 170 L130 200 L70 200 Z" />;
      case "player":
        return <path d="M72 86 C72 60 128 60 128 86 C118 74 82 74 72 86 Z" />;
      default:
        return null;
    }
  })();
  return (
    <g>
      {shoulders}
      {neck}
      {head}
      {hat}
    </g>
  );
}

function Details({ kind, hue, accent }: { kind: Character["portrait"]["silhouette"]; hue: string; accent: string }) {
  switch (kind) {
    case "creature":
      return (
        <g>
          <circle cx="86" cy="112" r="4" fill={accent} />
          <circle cx="114" cy="112" r="4" fill={accent} />
          <circle cx="86" cy="112" r="10" fill={accent} opacity="0.2" />
          <circle cx="114" cy="112" r="10" fill={accent} opacity="0.2" />
        </g>
      );
    case "admiral":
      return <g>{[0, 1, 2].map((i) => <circle key={i} cx="100" cy={190 + i * 14} r="2.4" fill={accent} />)}<path d="M96 62 L100 56 L104 62 Z" fill={accent} /></g>;
    case "scholar":
      return <g fill="none" stroke={accent} strokeWidth="1.5" opacity="0.8"><circle cx="89" cy="102" r="7" /><circle cx="111" cy="102" r="7" /><path d="M96 102 L104 102" /></g>;
    case "royal":
      return <g>{[86, 100, 114].map((x) => <circle key={x} cx={x} cy={64} r="2.2" fill={accent} />)}</g>;
    case "pilot":
      return <g fill={hue} opacity="0.75"><rect x="78" y="70" width="18" height="10" rx="5" /><rect x="104" y="70" width="18" height="10" rx="5" /></g>;
    case "player":
      return <text x="100" y="222" textAnchor="middle" fontSize="28" fontWeight="700" fill={hue} opacity="0.5" fontFamily="system-ui">9</text>;
    case "knight":
      return <rect x="80" y="100" width="40" height="3" rx="1.5" fill={accent} opacity="0.8" />;
    case "conductor":
      return <rect x="94" y="62" width="12" height="6" rx="2" fill={accent} />;
    case "witch":
      return <path d="M76 82 C90 86 110 86 124 82" stroke={accent} strokeWidth="2" fill="none" />;
    case "captain":
      return <circle cx="100" cy="66" r="3" fill={accent} />;
    case "builder":
      return <rect x="86" y="58" width="28" height="4" rx="2" fill={accent} />;
    default:
      return null;
  }
}
