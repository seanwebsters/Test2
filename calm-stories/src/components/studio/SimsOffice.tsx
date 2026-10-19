"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AGENTS, type AgentDefinition } from "@/lib/studio/agents";
import type { AgentState } from "@/lib/studio/team";
import type { AgentActivity, AgentKey } from "@/lib/studio/types";
import { cx } from "@/lib/util";

/**
 * The AI Team as a little isometric studio (Sims-style, Calm-styled). Every
 * person's place and pose comes from real workflow state: seated and typing
 * at their desk while working, walking to the lounge to nap when idle, hand
 * up with an amber mood gem when they need you.
 */

const TW = 64; // tile width
const TH = 32; // tile height
const GX = 24;
const GY = 18;
const OX = GY * (TW / 2) + 40;
const OY = 120;
const VW = (GX + GY) * (TW / 2) + 80;
const VH = (GX + GY) * (TH / 2) + OY + 40;

/** Grid → screen. */
const iso = (gx: number, gy: number, z = 0): [number, number] => [OX + (gx - gy) * (TW / 2), OY + (gx + gy) * (TH / 2) - z * TH];
const pts = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

type Zone = { gx: number; gy: number; w: number; d: number; label: string; floor: string; alt: string };
const ZONES: Zone[] = [
  { gx: 0, gy: 0, w: 6, d: 7, label: "Your office", floor: "#2b2d63", alt: "#30336d" },
  { gx: 6, gy: 0, w: 10, d: 7, label: "Development", floor: "#232a5a", alt: "#272f62" },
  { gx: 16, gy: 0, w: 8, d: 7, label: "Story table", floor: "#2a2b5f", alt: "#2e3068" },
  { gx: 0, gy: 7, w: 6, d: 5, label: "Quality gate", floor: "#252b5c", alt: "#293064" },
  { gx: 6, gy: 7, w: 10, d: 5, label: "Writers' room", floor: "#262c5e", alt: "#2a3166" },
  { gx: 16, gy: 7, w: 8, d: 5, label: "Art & sound", floor: "#2b2a5e", alt: "#302f68" },
  { gx: 0, gy: 12, w: 24, d: 6, label: "Lounge", floor: "#30315f", alt: "#353668" },
];

/** Where each agent sits (chair position). Desks are drawn just in front. */
const SEAT: Partial<Record<AgentKey, [number, number]>> = {
  network_executive: [2.6, 3.2],
  program_director: [7.6, 2.0],
  creative_director: [10.6, 2.0],
  worldbuilder: [13.6, 2.0],
  character_psychologist: [7.6, 4.8],
  romance_architect: [10.6, 4.8],
  series_architect: [13.6, 4.8],
  quality_controller: [3.0, 9.0],
  lead_writer: [7.6, 8.4],
  dialogue_editor: [10.6, 8.4],
  sleep_editor: [13.6, 8.4],
  continuity_editor: [9.1, 10.6],
  story_critic: [12.1, 10.6],
  art_director: [17.6, 8.4],
  audio_director: [20.6, 8.4],
  audio_producer: [19.1, 10.6],
};

/** Lounge spots for resting agents (on sofas and beanbags). */
const NAP: [number, number][] = [
  [2.2, 13.6], [3.4, 13.6], [4.6, 13.6], [7.6, 13.6], [8.8, 13.6], [10.0, 13.6],
  [14.2, 13.6], [15.4, 13.6], [16.6, 13.6], [5.6, 16.2], [3.4, 16.2], [8.0, 16.3],
  [11.0, 16.3], [14.0, 16.3], [17.0, 16.3], [19.6, 15.4], [21.0, 15.4], [20.3, 16.6],
];

const GEM: Record<"work" | "help" | "rest" | "done", [string, string]> = {
  work: ["#c7b8ff", "#8a74e8"],
  help: ["#ffe1a0", "#f2a93b"],
  rest: ["#bfe0ff", "#6f9bd6"],
  done: ["#b9f5d0", "#3fbf7f"],
};

const LABEL: Record<AgentActivity, string> = {
  sleeping: "Resting", thinking: "Planning", typing: "Writing", reading: "Reviewing", handing_off: "Handing off", celebrating: "Done", asking_for_help: "Needs you",
};

const short = (s: string, n = 24) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** An isometric box: top, left and right faces. */
function Box({ gx, gy, w, d, h, z = 0, top, left, right, className }: { gx: number; gy: number; w: number; d: number; h: number; z?: number; top: string; left: string; right: string; className?: string }) {
  const a = iso(gx, gy, z + h), b = iso(gx + w, gy, z + h), c = iso(gx + w, gy + d, z + h), e = iso(gx, gy + d, z + h);
  const c0 = iso(gx + w, gy + d, z), e0 = iso(gx, gy + d, z), b0 = iso(gx + w, gy, z);
  return (
    <g className={className}>
      <polygon points={pts([e, c, c0, e0])} fill={left} />
      <polygon points={pts([c, b, b0, c0])} fill={right} />
      <polygon points={pts([a, b, c, e])} fill={top} />
    </g>
  );
}

type Drawable = { depth: number; key: string; node: ReactNode };

function Desk({ gx, gy, lit, prop }: { gx: number; gy: number; lit: boolean; prop: AgentDefinition["bedroom"]["prop"] }): Drawable[] {
  // desk sits in front of the seat
  const dx = gx - 0.9, dy = gy + 0.55;
  const [mx, my] = iso(dx + 0.75, dy + 0.15, 0.95);
  return [
    {
      depth: dx + dy + 1.6,
      key: `desk-${gx}-${gy}`,
      node: (
        <g>
          <Box gx={dx} gy={dy} w={1.8} d={0.8} h={0.55} top="#8a6a50" left="#5a4636" right="#6d5642" />
          <Box gx={dx + 0.55} gy={dy + 0.1} w={0.7} d={0.12} h={0.4} z={0.55} top="#3a3f7a" left="#1e2350" right="#262b60" />
          <polygon points={pts([iso(dx + 0.6, dy + 0.22, 0.62), iso(dx + 1.2, dy + 0.22, 0.62), iso(dx + 1.2, dy + 0.22, 0.9), iso(dx + 0.6, dy + 0.22, 0.9)])} fill={lit ? "#c9d6ff" : "#1b2050"} className={lit ? "sims-screen" : ""} />
          {lit && <circle cx={mx} cy={my + 6} r="34" fill="url(#simsLamp)" className="sims-glow" />}
          <text x={iso(dx + 1.55, dy + 0.5, 0.6)[0]} y={iso(dx + 1.55, dy + 0.5, 0.6)[1]} fontSize="12" textAnchor="middle">{PROP[prop]}</text>
        </g>
      ),
    },
  ];
}

const PROP: Record<AgentDefinition["bedroom"]["prop"], string> = {
  crown: "👑", chart: "📈", clapper: "🎬", romance_book: "📖", map: "🗺️", notebook: "📓", blueprint: "📐", laptop: "💻",
  quill: "🪶", moon: "🌙", magnifier: "🔎", spectacles: "👓", palette: "🎨", headphones: "🎧", mixer: "🎚️", shield: "🛡️",
};

/** A little person. Pose: seated (at desk), napping (lounge), walking, or hand up. */
function Person({ def, pose, activity }: { def: AgentDefinition; pose: "seated" | "nap" | "walk"; activity: AgentActivity }) {
  const b = def.bedroom;
  const busy = activity === "typing" || activity === "reading";
  const help = activity === "asking_for_help";
  const sit = pose === "seated";
  const nap = pose === "nap";
  return (
    <g className={cx(pose === "walk" && "sims-walk", nap && "sims-breathe")}>
      <ellipse cx="0" cy="2" rx="13" ry="5" fill="#000" opacity="0.25" />
      {/* legs */}
      {sit || nap ? (
        <rect x="-8" y="-10" width="16" height="9" rx="4" fill="#2b2f55" />
      ) : (
        <>
          <rect x="-7" y="-14" width="6" height="15" rx="3" fill="#2b2f55" className="sims-leg-a" />
          <rect x="1" y="-14" width="6" height="15" rx="3" fill="#2b2f55" className="sims-leg-b" />
        </>
      )}
      {/* arms (skin), then short tee sleeves on top */}
      <rect x="-14.5" y={help ? -52 : sit || nap ? -27 : -31} width="5" height={help ? 22 : 14} rx="2.5" fill={b.skin} className={busy ? "sims-type" : ""} />
      <rect x="9.5" y={sit || nap ? -27 : -31} width="5" height="14" rx="2.5" fill={b.skin} className={busy ? "sims-type sims-type-2" : ""} />
      {/* Calm tee: the app icon's sky-blue → violet gradient, white "Calm" script */}
      <g transform={`translate(0 ${sit || nap ? -30 : -34})`}>
        <path d="M-10 3 q0 -3 3 -3 h14 q3 0 3 3 v16 q0 3 -3 3 h-14 q-3 0 -3 -3z" fill="url(#calmTee)" stroke="#1d2a6b" strokeOpacity="0.35" strokeWidth="0.8" />
        <path d={help ? "M-10 2 l-5 -3 l-1.5 5 l5 2z" : "M-10 2 l-5 3 l1.5 5 l4 -2z"} fill="url(#calmTee)" />
        <path d="M10 2 l5 3 l-1.5 5 l-4 -2z" fill="url(#calmTee)" />
        <path d="M-4 0 q4 3 8 0" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1" fill="none" />
        <text x="0" y="13" textAnchor="middle" className="sims-tee">Calm</text>
        <path d="M-10 15 h20 v4 q0 3 -3 3 h-14 q-3 0 -3 -3z" fill="#1d2a6b" opacity="0.18" />
      </g>
      {/* head */}
      <g transform={`translate(0 ${sit || nap ? -40 : -44}) ${nap ? "rotate(-12)" : ""}`}>
        <circle r="10" fill={b.skin} />
        <circle cx="-5.5" cy="4.5" r="2" fill="#ff9aa8" opacity="0.35" />
        <circle cx="5.5" cy="4.5" r="2" fill="#ff9aa8" opacity="0.35" />
        <circle cx="-3" cy="-4" r="4" fill="#ffffff" opacity="0.08" />
        <path d="M-10 -1 a10 10 0 0 1 20 0 q-5 -4 -10 -3 q-5 -1 -10 3z" fill={b.hair} />
        {nap || activity === "sleeping" ? (
          <path d="M-5 2 h3 M2 2 h3" stroke="#1e1a2e" strokeWidth="1.3" strokeLinecap="round" />
        ) : (
          <>
            <circle cx="-3.5" cy="2" r="1.3" fill="#1e1a2e" />
            <circle cx="3.5" cy="2" r="1.3" fill="#1e1a2e" />
            <path d="M-2.5 5.5 q2.5 2 5 0" stroke="#1e1a2e" strokeWidth="1" fill="none" strokeLinecap="round" />
          </>
        )}
      </g>
    </g>
  );
}

/** Floating crescent-moon mood gem (our own – not a plumbob). */
function MoodGem({ kind, y }: { kind: keyof typeof GEM; y: number }) {
  const [light, dark] = GEM[kind];
  return (
    <g transform={`translate(0 ${y})`}>
      <g className="sims-gem">
        <polygon points="0,-11 7,0 0,11 -7,0" fill={dark} />
        <polygon points="0,-11 7,0 0,0" fill={light} />
        <polygon points="0,-11 -7,0 0,0" fill={light} opacity="0.75" />
        <circle cx="2.2" cy="-2" r="3.2" fill={dark} opacity="0.55" />
        <circle r="13" fill={light} opacity="0.18" />
      </g>
    </g>
  );
}

export function SimsOffice({ agents, onOpen }: { agents: AgentState[]; onOpen: (key: AgentKey) => void }) {
  const st = (k: AgentKey) => agents.find((a) => a.key === k);
  // Walking: when someone moves between desk and lounge, show the walk cycle for the trip.
  const prevAt = useRef<Partial<Record<AgentKey, boolean>>>({});
  const [walking, setWalking] = useState<Partial<Record<AgentKey, boolean>>>({});
  let napIdx = 0;
  const people = AGENTS.map((def) => {
    const s = st(def.key);
    const activity: AgentActivity = def.human ? (s?.activity ?? "sleeping") : (s?.activity ?? "sleeping");
    const atDesk = def.human || activity !== "sleeping";
    const spot = atDesk ? SEAT[def.key]! : NAP[napIdx++ % NAP.length]!;
    return { def, s, activity, atDesk, spot };
  });
  useEffect(() => {
    const changed: AgentKey[] = [];
    for (const p of people) {
      if (prevAt.current[p.def.key] !== undefined && prevAt.current[p.def.key] !== p.atDesk) changed.push(p.def.key);
      prevAt.current[p.def.key] = p.atDesk;
    }
    if (!changed.length) return;
    setWalking((w) => ({ ...w, ...Object.fromEntries(changed.map((k) => [k, true])) }));
    const t = setTimeout(() => setWalking((w) => ({ ...w, ...Object.fromEntries(changed.map((k) => [k, false])) })), 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people.map((p) => `${p.def.key}:${p.atDesk}`).join("|")]);

  const items: Drawable[] = [];

  // Furniture
  for (const [k, seat] of Object.entries(SEAT) as [AgentKey, [number, number]][]) {
    const p = people.find((x) => x.def.key === k)!;
    items.push(...Desk({ gx: seat[0], gy: seat[1], lit: p.atDesk && p.activity !== "sleeping", prop: p.def.bedroom.prop }));
    // chair
    items.push({ depth: seat[0] + seat[1] - 0.2, key: `chair-${k}`, node: <Box gx={seat[0] - 0.3} gy={seat[1] - 0.3} w={0.6} d={0.6} h={0.3} top="#3b3f7a" left="#252a5c" right="#2d3268" /> });
  }
  // Story table + chairs
  items.push({ depth: 19 + 3 + 2.4, key: "story-table", node: <g><Box gx={18.4} gy={2.2} w={3.2} d={2.2} h={0.5} top="#8a6a50" left="#5a4636" right="#6d5642" /><Box gx={19.3} gy={2.9} w={1.2} d={0.8} h={0.04} z={0.5} top="#f3eaff" left="#cfc6ee" right="#ddd4f7" /></g> });
  // Quality gate arch
  items.push({ depth: 1.2 + 9.6 + 0.4, key: "gate", node: <g><Box gx={0.8} gy={9.2} w={0.25} d={0.25} h={1.6} top="#c7b8ff" left="#6b5fc4" right="#8a7be0" /><Box gx={0.8} gy={10.6} w={0.25} d={0.25} h={1.6} top="#c7b8ff" left="#6b5fc4" right="#8a7be0" /><Box gx={0.8} gy={9.2} w={0.25} d={1.65} h={0.2} z={1.6} top="#c7b8ff" left="#6b5fc4" right="#8a7be0" /></g> });
  // Lounge: rug, sofas, beanbags, fireplace, bookshelf, tea table
  const sofa = (gx: number, gy: number, len: number, key: string) => items.push({ depth: gx + gy + 0.2, key, node: <g><Box gx={gx} gy={gy} w={len} d={0.9} h={0.35} top="#6b5fc4" left="#4a3f98" right="#574bb0" /><Box gx={gx} gy={gy} w={len} d={0.3} h={0.75} top="#7d70d6" left="#4a3f98" right="#574bb0" /></g> });
  sofa(1.4, 13.0, 4.0, "sofa-1");
  sofa(6.8, 13.0, 4.0, "sofa-2");
  sofa(13.4, 13.0, 4.0, "sofa-3");
  for (const [i, [x, y]] of ([[3.4, 16.2], [8.0, 16.3], [11.0, 16.3], [14.0, 16.3], [17.0, 16.3], [20.3, 16.6]] as [number, number][]).entries())
    items.push({ depth: x + y - 0.4, key: `bean-${i}`, node: <ellipse cx={iso(x, y)[0]} cy={iso(x, y)[1] - 4} rx="20" ry="10" fill={["#4a5aa0", "#6b5fc4", "#3f6f8a", "#5a4f9a"][i % 4]} opacity="0.9" /> });
  // a soft rug in the lounge
  items.unshift({ depth: -1, key: "rug", node: <polygon points={pts([iso(5, 14.4), iso(19, 14.4), iso(19, 17.4), iso(5, 17.4)])} fill="#3b3f7a" opacity="0.55" /> });
  items.push({ depth: 0.6 + 14.2, key: "fire", node: <g><Box gx={0.05} gy={14.4} w={0.6} d={2.2} h={1.3} top="#6d5642" left="#3a2a22" right="#4a372c" /><polygon points={pts([iso(0.66, 14.8, 0.2), iso(0.66, 16.2, 0.2), iso(0.66, 16.2, 0.85), iso(0.66, 14.8, 0.85)])} fill="#ff9a5c" className="sims-fire" /><circle cx={iso(1.4, 15.5)[0]} cy={iso(1.4, 15.5)[1]} r="46" fill="url(#simsLamp)" className="sims-glow" /></g> });
  items.push({ depth: 0.5 + 12.4, key: "shelf", node: <Box gx={0.05} gy={12.3} w={0.45} d={1.6} h={1.8} top="#6d5642" left="#4a372c" right="#5a4636" /> });
  // Plants
  for (const [i, [x, y]] of ([[0.5, 0.5], [15.5, 0.4], [23.3, 0.5], [0.4, 6.4], [15.5, 7.4], [23.3, 11.4], [0.5, 17.3], [12.6, 15.2]] as [number, number][]).entries())
    items.push({ depth: x + y + 0.5, key: `plant-${i}`, node: <g><Box gx={x} gy={y} w={0.4} d={0.4} h={0.35} top="#8a5a3f" left="#5a3a2a" right="#6d4a33" />{(() => { const [px, py] = iso(x + 0.2, y + 0.2, 0.7); return <g><circle cx={px} cy={py} r="11" fill="#2f6b5a" /><circle cx={px - 6} cy={py - 5} r="7" fill="#3f8a72" /><circle cx={px + 6} cy={py - 6} r="6" fill="#4fa386" /></g>; })()}</g> });

  // People
  for (const p of people) {
    const [x, y] = iso(p.spot[0], p.spot[1]);
    const pose = walking[p.def.key] ? "walk" : p.atDesk ? "seated" : "nap";
    const gem: keyof typeof GEM = p.activity === "asking_for_help" ? "help" : p.activity === "celebrating" ? "done" : p.atDesk ? "work" : "rest";
    items.push({
      depth: p.spot[0] + p.spot[1],
      key: `person-${p.def.key}`,
      node: (
        <g
          className="sims-person"
          style={{ transform: `translate(${x}px, ${y}px)` }}
          onClick={() => onOpen(p.def.key)}
          role="button"
          tabIndex={0}
          aria-label={`${p.def.name}: ${LABEL[p.activity]}${p.s?.task ? ` – ${p.s.task.label}` : ""}`}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(p.def.key)}
        >
          {p.activity === "asking_for_help" && <ellipse cx="0" cy="2" rx="22" ry="9" fill="none" stroke="#ffc96b" strokeWidth="2" className="sims-pulse" />}
          <Person def={p.def} pose={pose} activity={p.activity} />
          <MoodGem kind={gem} y={pose === "walk" ? -74 : -70} />
          {!p.atDesk && pose === "nap" && <text x="12" y="-56" fontSize="11" fill="#c9d6ff" className="sims-z">z</text>}
        </g>
      ),
    });
  }
  items.sort((a, b) => a.depth - b.depth);

  // Back walls with moonlit windows
  const wallH = 2.6;
  const backLeft = [iso(0, 0), iso(0, GY), iso(0, GY, wallH), iso(0, 0, wallH)] as [number, number][];
  const backRight = [iso(0, 0), iso(GX, 0), iso(GX, 0, wallH), iso(0, 0, wallH)] as [number, number][];

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a1026]">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="sims-office block w-full" role="img" aria-label="The AI team in the studio">
        <defs>
          <radialGradient id="simsLamp"><stop offset="0" stopColor="#ffd9a0" stopOpacity="0.55" /><stop offset="1" stopColor="#ffd9a0" stopOpacity="0" /></radialGradient>
          <linearGradient id="simsSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#24306e" /><stop offset="1" stopColor="#0d1638" /></linearGradient>
          <linearGradient id="calmTee" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stopColor="#5fb4ea" /><stop offset="1" stopColor="#6a55e0" /></linearGradient>
        </defs>
        {/* walls */}
        <polygon points={pts(backLeft)} fill="#22285a" />
        <polygon points={pts(backRight)} fill="#262d63" />
        {[3, 9, 15, 21].map((gx) => (
          <g key={`wr-${gx}`}>
            <polygon points={pts([iso(gx, 0, 0.9), iso(gx + 2, 0, 0.9), iso(gx + 2, 0, 2.1), iso(gx, 0, 2.1)])} fill="url(#simsSky)" stroke="#a99bf4" strokeOpacity="0.35" />
            <circle cx={iso(gx + 1.4, 0, 1.75)[0]} cy={iso(gx + 1.4, 0, 1.75)[1]} r="1.3" fill="#fff" className="sims-twinkle" />
            {gx === 15 && <circle cx={iso(gx + 1.3, 0, 1.6)[0]} cy={iso(gx + 1.3, 0, 1.6)[1]} r="6" fill="#f3eaff" />}
          </g>
        ))}
        {[4, 10, 15].map((gy) => (
          <polygon key={`wl-${gy}`} points={pts([iso(0, gy, 0.9), iso(0, gy + 2, 0.9), iso(0, gy + 2, 2.1), iso(0, gy, 2.1)])} fill="url(#simsSky)" stroke="#a99bf4" strokeOpacity="0.35" />
        ))}
        {/* floors (checker tiles per zone) */}
        {ZONES.map((z) => (
          <g key={z.label}>
            {Array.from({ length: z.w * z.d }, (_, i) => {
              const tx = z.gx + (i % z.w), ty = z.gy + Math.floor(i / z.w);
              return <polygon key={i} points={pts([iso(tx, ty), iso(tx + 1, ty), iso(tx + 1, ty + 1), iso(tx, ty + 1)])} fill={(tx + ty) % 2 ? z.floor : z.alt} />;
            })}
          </g>
        ))}
        {/* low room dividers (walls-down view) with doorways */}
        <Box gx={6} gy={0} w={0.12} d={2.6} h={0.45} top="#4a4f8f" left="#2a2f6b" right="#353a7a" />
        <Box gx={6} gy={4.4} w={0.12} d={2.6} h={0.45} top="#4a4f8f" left="#2a2f6b" right="#353a7a" />
        <Box gx={16} gy={0} w={0.12} d={2.6} h={0.45} top="#4a4f8f" left="#2a2f6b" right="#353a7a" />
        <Box gx={16} gy={4.4} w={0.12} d={2.6} h={0.45} top="#4a4f8f" left="#2a2f6b" right="#353a7a" />
        {/* zone labels on the floor */}
        {ZONES.map((z) => {
          const [x, y] = iso(z.gx + 0.6, z.gy + z.d - 0.4);
          return <text key={`l-${z.label}`} x={x} y={y} className="sims-zone">{z.label.toUpperCase()}</text>;
        })}
        {/* everything else, back to front */}
        {items.map((it) => <g key={it.key}>{it.node}</g>)}
        {/* name tags on top, above each mood gem */}
        {people.map((p) => {
          const [x, y] = iso(p.spot[0], p.spot[1]);
          return <text key={`n-${p.def.key}`} x={x} y={y - 88} textAnchor="middle" className="sims-name" pointerEvents="none" style={{ transition: "x 2.4s, y 2.4s" }}>{p.def.name}</text>;
        })}
        {/* thought bubbles on top */}
        {people.map((p) => {
          const text = p.activity === "asking_for_help" ? (p.def.human ? "Your approvals" : `Needs you: ${short(p.s?.needs ?? p.s?.task?.label ?? "help", 16)}`) : p.atDesk && p.s?.task ? short(p.s.task.label) : p.activity === "thinking" ? "Thinking…" : null;
          if (!text || walking[p.def.key]) return null;
          const [x, y] = iso(p.spot[0], p.spot[1]);
          return (
            <g key={`b-${p.def.key}`} transform={`translate(${x} ${y - 112})`} pointerEvents="none">
              <g className="sims-bubble">
                <rect x={-text.length * 3 - 10} y="-12" width={text.length * 6 + 20} height="21" rx="10.5" fill="#f3eaff" />
                <circle cx="-4" cy="14" r="3" fill="#f3eaff" />
                <circle cx="-1" cy="20" r="1.8" fill="#f3eaff" />
                <text y="2" textAnchor="middle" className="sims-bubble-text">{text}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 px-4 py-3 text-[12px]">
        {people.map(({ def, activity, atDesk }) => (
          <li key={def.key}>
            <button onClick={() => onOpen(def.key)} className="flex items-center gap-1.5 hover:text-white">
              <span className="h-2 w-2 rounded-full" style={{ background: GEM[activity === "asking_for_help" ? "help" : atDesk ? "work" : "rest"][1] }} />
              <span className="text-white/90">{def.name}</span>
              <span className={activity === "asking_for_help" ? "text-amber-200" : atDesk ? "text-lavender" : "text-mist"}>· {def.human ? (activity === "asking_for_help" ? "Needs you" : "All clear") : LABEL[activity]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
