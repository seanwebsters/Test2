import { memo } from 'react';

const BASE = `${import.meta.env.BASE_URL}art/`;
import { GeneratorId, ItemKey, parse } from '../game/items';

/** Shared gradients for every icon; rendered once at the root. */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <radialGradient id="gPink" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fbd3dc" />
          <stop offset="1" stopColor="#d5798c" />
        </radialGradient>
        <radialGradient id="gRose" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f7c3cd" />
          <stop offset="1" stopColor="#c25a72" />
        </radialGradient>
        <radialGradient id="gMoon" cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c8b9e8" />
        </radialGradient>
        <linearGradient id="gLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9c49a" />
          <stop offset="1" stopColor="#5e7f58" />
        </linearGradient>
        <linearGradient id="gBrass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0d6a2" />
          <stop offset="1" stopColor="#b98a56" />
        </linearGradient>
        <linearGradient id="gSilver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3f1f7" />
          <stop offset="1" stopColor="#a6a3b8" />
        </linearGradient>
        <linearGradient id="gRust" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c99a7e" />
          <stop offset="1" stopColor="#8a5a48" />
        </linearGradient>
        <linearGradient id="gCrystal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ece3ff" />
          <stop offset="0.5" stopColor="#b9a2ea" />
          <stop offset="1" stopColor="#7d63b8" />
        </linearGradient>
        <linearGradient id="gCrystalD" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a58ad9" />
          <stop offset="1" stopColor="#5f4a96" />
        </linearGradient>
        <linearGradient id="gPaper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdf8ef" />
          <stop offset="1" stopColor="#eadcc4" />
        </linearGradient>
        <linearGradient id="gSage" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8bea3" />
          <stop offset="1" stopColor="#6f8a6c" />
        </linearGradient>
        <linearGradient id="gPlum" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a6f95" />
          <stop offset="1" stopColor="#5a3d5c" />
        </linearGradient>
        <linearGradient id="gNight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5c63a0" />
          <stop offset="1" stopColor="#2d2f5a" />
        </linearGradient>
        <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#d9e6f2" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="gSand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e2bf" />
          <stop offset="1" stopColor="#d8b685" />
        </linearGradient>
        <radialGradient id="gTime" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#f2fbff" />
          <stop offset="0.6" stopColor="#9fcbe8" />
          <stop offset="1" stopColor="#5f86c0" />
        </radialGradient>
        <linearGradient id="gWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b88b6e" />
          <stop offset="1" stopColor="#7a5545" />
        </linearGradient>
        <radialGradient id="gGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gGlowLav" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#efe4ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#efe4ff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export const ItemIcon = memo(function ItemIcon({ item, size = 48 }: { item: ItemKey; size?: number }) {
  const { chain, level } = parse(item);
  return <img className="item-img" src={`${BASE}items/${chain}_${level}.webp`} width={size} height={size} alt="" draggable={false} />;
});

export const GenIcon = memo(function GenIcon({ gen, size = 48 }: { gen: GeneratorId; size?: number }) {
  return <img className="item-img" src={`${BASE}items/gen_${gen}.webp`} width={size} height={size} alt="" draggable={false} />;
});
