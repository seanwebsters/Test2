"use client";

import { AGENTS, type AgentDefinition } from "@/lib/studio/agents";
import type { AgentState } from "@/lib/studio/team";
import type { AgentActivity, AgentKey } from "@/lib/studio/types";
import { cx } from "@/lib/util";

/**
 * The AI Team as a calm, moonlit top-down studio. Every agent's position and
 * pose comes from real workflow state: at their desk (lamp on) while working,
 * dozing in the lounge while idle, hand raised when they need you.
 */

const W = 1200;
const H = 760;

type Room = { x: number; y: number; w: number; h: number; label: string; floor: string };
const ROOMS: Room[] = [
  { x: 24, y: 24, w: 270, h: 276, label: "Your office", floor: "#16204a" },
  { x: 306, y: 24, w: 560, h: 276, label: "Development", floor: "#131c42" },
  { x: 878, y: 24, w: 298, h: 276, label: "Story table", floor: "#171f48" },
  { x: 24, y: 312, w: 270, h: 200, label: "Quality gate", floor: "#141d44" },
  { x: 306, y: 312, w: 560, h: 200, label: "Writers' room", floor: "#151e46" },
  { x: 878, y: 312, w: 298, h: 200, label: "Art & sound", floor: "#161d45" },
  { x: 24, y: 524, w: 1152, h: 212, label: "Lounge", floor: "#1a2150" },
];

/** Desk positions (centre of the person) per agent. */
const DESK: Partial<Record<AgentKey, [number, number]>> = {
  network_executive: [158, 170],
  program_director: [400, 120],
  creative_director: [585, 120],
  worldbuilder: [770, 120],
  character_psychologist: [400, 235],
  romance_architect: [585, 235],
  series_architect: [770, 235],
  quality_controller: [180, 405],
  lead_writer: [400, 385],
  dialogue_editor: [585, 385],
  sleep_editor: [770, 385],
  continuity_editor: [492, 470],
  story_critic: [678, 470],
  art_director: [960, 385],
  audio_director: [1095, 385],
  audio_producer: [1027, 470],
};

/** Sofa seats in the lounge for resting agents: three rows of six. */
const SEATS: [number, number][] = Array.from({ length: 18 }, (_, i) => [150 + (i % 6) * 180 + (Math.floor(i / 6) % 2 ? 90 : 0), 588 + Math.floor(i / 6) * 62]);

const STATUS: Record<AgentActivity, { label: string; tone: string }> = {
  sleeping: { label: "Resting", tone: "text-mist" },
  thinking: { label: "Planning", tone: "text-lavender" },
  typing: { label: "Writing", tone: "text-lavender" },
  reading: { label: "Reviewing", tone: "text-lavender" },
  handing_off: { label: "Handing off", tone: "text-lavender" },
  celebrating: { label: "Done", tone: "text-emerald-300" },
  asking_for_help: { label: "Needs you", tone: "text-amber-200" },
};

const PROP_ICON: Record<AgentDefinition["bedroom"]["prop"], string> = {
  crown: "👑", chart: "📈", clapper: "🎬", romance_book: "📖", map: "🗺️", notebook: "📓", blueprint: "📐", laptop: "💻",
  quill: "🪶", moon: "🌙", magnifier: "🔎", spectacles: "👓", palette: "🎨", headphones: "🎧", mixer: "🎚️", shield: "🛡️",
};

const short = (s: string, n = 26) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function StudioOffice({ agents, onOpen }: { agents: AgentState[]; onOpen: (key: AgentKey) => void }) {
  const state = (k: AgentKey) => agents.find((a) => a.key === k);
  let seat = 0;
  const placed = AGENTS.map((def) => {
    const st = state(def.key);
    const activity: AgentActivity = def.human ? (st?.activity ?? "asking_for_help") : (st?.activity ?? "sleeping");
    const atDesk = def.human || activity !== "sleeping";
    const pos = atDesk ? DESK[def.key]! : SEATS[seat++ % SEATS.length]!;
    return { def, st, activity, atDesk, pos };
  });
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a1026]">
      <svg viewBox={`0 0 ${W} ${H}`} className="studio-office block w-full" role="img" aria-label="The AI team in the studio office">
        <defs>
          <radialGradient id="lamp" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="help" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffc96b" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffc96b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="window" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#24306e" />
            <stop offset="1" stopColor="#0d1638" />
          </linearGradient>
          <pattern id="boards" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 40 L40 0" stroke="#ffffff" strokeOpacity="0.025" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Rooms */}
        {ROOMS.map((r) => (
          <g key={r.label}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="22" fill={r.floor} stroke="#ffffff" strokeOpacity="0.06" />
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="22" fill="url(#boards)" />
            <text x={r.x + 18} y={r.label === "Lounge" ? r.y + 26 : r.y + r.h - 14} className="office-room-label">{r.label.toUpperCase()}</text>
          </g>
        ))}

        {/* Moonlit windows along the top wall */}
        {[110, 420, 560, 700, 960, 1070].map((x, i) => (
          <g key={x} transform={`translate(${x} 5)`}>
            <rect width="90" height="14" rx="5" fill="url(#window)" stroke="#a99bf4" strokeOpacity="0.3" />
            {i === 2 && <circle cx="72" cy="7" r="4.5" fill="#f3eaff" opacity="0.9" />}
            <circle cx={18 + i * 7} cy="5" r="1.1" fill="#fff" className="office-twinkle" />
            <circle cx={44} cy="9" r="0.9" fill="#fff" className="office-twinkle" style={{ animationDelay: `${i * 0.6}s` }} />
          </g>
        ))}

        {/* Story table */}
        <ellipse cx="1027" cy="170" rx="95" ry="58" fill="#5a4636" />
        <ellipse cx="1027" cy="170" rx="95" ry="58" fill="none" stroke="#ffd9a0" strokeOpacity="0.15" />
        {[[-110, 0], [110, 0], [-50, -72], [50, -72], [-50, 72], [50, 72]].map(([dx, dy], i) => <circle key={i} cx={1027 + dx!} cy={170 + dy!} r="13" fill="#2a2f6b" />)}
        <rect x="995" y="155" width="64" height="30" rx="4" fill="#f3eaff" opacity="0.85" />
        <text x="1027" y="175" textAnchor="middle" fontSize="11" fill="#2a2f6b">Season plan</text>

        {/* Quality gate arch */}
        <path d="M60 440 v-40 a24 24 0 0 1 48 0 v40" fill="none" stroke="#a99bf4" strokeOpacity="0.5" strokeWidth="5" />
        <text x="84" y="456" textAnchor="middle" fontSize="10" fill="#a99bf4" opacity="0.7">GATE</text>

        {/* Lounge: rug, sofas, fireplace, tea, a sleepy cat */}
        <ellipse cx="600" cy="650" rx="470" ry="80" fill="#2a2f6b" opacity="0.35" />
        {[588, 650, 712].map((y) => <rect key={y} x="90" y={y - 2} width="1030" height="22" rx="11" fill="#3b2f6b" opacity="0.65" />)}
        <rect x="1128" y="560" width="40" height="56" rx="8" fill="#3a2a22" />
        <rect x="1136" y="578" width="24" height="28" rx="6" fill="#ff9a5c" className="office-fire" />
        <g transform="translate(60 712)"><ellipse rx="14" ry="8" fill="#c9b8ff" opacity="0.6" /><circle cx="11" cy="-4" r="5" fill="#c9b8ff" opacity="0.6" /></g>

        {/* Plants */}
        {[[280, 290], [856, 290], [282, 500], [1164, 500], [44, 544]].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><circle r="11" fill="#2f6b5a" /><circle cx="-6" cy="-5" r="7" fill="#3f8a72" /><circle cx="6" cy="-6" r="6" fill="#4fa386" /></g>
        ))}

        {/* Lamp glow behind each desk that someone is working at */}
        {placed.filter((p) => DESK[p.def.key] && p.atDesk && p.activity !== "sleeping").map(({ def, activity }) => {
          const [x, y] = DESK[def.key]!;
          return <circle key={`glow-${def.key}`} cx={x} cy={y + 14} r="72" fill={activity === "asking_for_help" ? "url(#help)" : "url(#lamp)"} className="office-glow" />;
        })}
        {/* Empty chairs at desks whose owner is in the lounge */}
        {placed.filter((p) => DESK[p.def.key] && !p.atDesk).map(({ def }) => {
          const [x, y] = DESK[def.key]!;
          return <circle key={`chair-${def.key}`} cx={x} cy={y - 2} r="13" fill="#2a2f6b" />;
        })}
        {/* People */}
        {placed.map(({ def, st, activity, atDesk, pos }) => {
          const [x, y] = pos;
          const busy = activity === "typing" || activity === "reading";
          return (
            <g
              key={def.key}
              className="office-person"
              style={{ transform: `translate(${x}px, ${y}px)` }}
              onClick={() => onOpen(def.key)}
              role="button"
              tabIndex={0}
              aria-label={`${def.name}: ${STATUS[activity].label}${st?.task ? ` – ${st.task.label}` : ""}`}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(def.key)}
            >
              {activity === "asking_for_help" && <circle r="30" fill="none" stroke="#ffc96b" strokeOpacity="0.7" strokeWidth="2" className="office-pulse" />}
              <g className={cx(!atDesk && "office-breathe")}>
                {/* body */}
                <rect x="-15" y="-2" width="30" height="22" rx="10" fill={def.bedroom.blanket} />
                {/* arms */}
                <rect x="-19" y={activity === "asking_for_help" ? -26 : 4} width="7" height={activity === "asking_for_help" ? 22 : 12} rx="3.5" fill={def.bedroom.skin} className={busy ? "office-type" : ""} />
                <rect x="12" y="4" width="7" height="12" rx="3.5" fill={def.bedroom.skin} className={busy ? "office-type office-type-2" : ""} />
                {/* head */}
                <circle cy="-12" r="12" fill={def.bedroom.skin} />
                <path d="M-12 -13 a12 12 0 0 1 24 0 q-6 -5 -12 -4 q-6 -1 -12 4z" fill={def.bedroom.hair} />
                {atDesk ? (
                  <>
                    <circle cx="-4" cy="-10" r="1.4" fill="#1e1a2e" />
                    <circle cx="4" cy="-10" r="1.4" fill="#1e1a2e" />
                  </>
                ) : (
                  <path d="M-6 -10 h4 M2 -10 h4" stroke="#1e1a2e" strokeWidth="1.4" strokeLinecap="round" />
                )}
              </g>
              {!atDesk && <text x="14" y="-24" fontSize="12" fill="#c9d6ff" className="office-z">z</text>}
              {activity === "celebrating" && <text x="16" y="-22" fontSize="14">✨</text>}
              {/* name tag */}
              <g transform={`translate(0 ${atDesk ? -36 : -32}) scale(${atDesk ? 1 : 0.85})`}>
                <rect x={-def.name.length * 3.3 - 8} y="-11" width={def.name.length * 6.6 + 16} height="18" rx="9" fill={activity === "asking_for_help" ? "#ffc96b" : atDesk ? "#a99bf4" : "#2a2f6b"} />
                <text textAnchor="middle" y="2" className="office-name" fill={atDesk || activity === "asking_for_help" ? "#0b1430" : "#c9d6ff"}>{def.name}</text>
              </g>

            </g>
          );
        })}
        {/* Desks in front of the people, so everyone sits behind their desk */}
        {placed.filter((p) => DESK[p.def.key]).map(({ def, atDesk, activity }) => {
          const [x, y] = DESK[def.key]!;
          const lit = atDesk && activity !== "sleeping";
          return (
            <g key={`desk-${def.key}`} pointerEvents="none">
              <rect x={x - 46} y={y + 10} width="92" height="32" rx="9" fill="#5a4636" />
              <rect x={x - 46} y={y + 10} width="92" height="6" rx="3" fill="#6d5642" />
              <text x={x + 30} y={y + 34} fontSize="14" textAnchor="middle">{PROP_ICON[def.bedroom.prop]}</text>
              <rect x={x - 14} y={y + 19} width="22" height="13" rx="3" fill={lit ? "#c9d6ff" : "#2a2f6b"} className={lit ? "office-screen" : ""} />
            </g>
          );
        })}
        {/* Speech bubbles on top of everything */}
        {placed.map(({ def, st, activity, atDesk, pos }) => {
          const bubble = activity === "asking_for_help" ? (def.human ? "Your approvals" : `Needs you: ${short(st?.needs ?? st?.task?.label ?? "help", 18)}`) : atDesk && st?.task ? short(st.task.label) : activity === "thinking" ? "Thinking…" : null;
          if (!bubble) return null;
          return (
            <g key={`bubble-${def.key}`} transform={`translate(${pos[0]} ${pos[1] - 62})`} pointerEvents="none">
              <g className="office-bubble">
                <rect x={-bubble.length * 3.1 - 10} y="-13" width={bubble.length * 6.2 + 20} height="22" rx="11" fill="#f3eaff" />
                <path d="M-5 9 L0 15 L5 9z" fill="#f3eaff" />
                <text textAnchor="middle" y="2" className="office-bubble-text">{bubble}</text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Status bar */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 px-4 py-3 text-[12px]">
        {placed.map(({ def, activity }) => (
          <li key={def.key}>
            <button onClick={() => onOpen(def.key)} className="flex items-center gap-1.5 hover:text-white">
              <span className="h-2 w-2 rounded-full" style={{ background: def.bedroom.blanket, boxShadow: `0 0 0 1px ${def.bedroom.accent}` }} />
              <span className="text-white/90">{def.name}</span>
              <span className={STATUS[activity].tone}>· {def.human ? (activity === "asking_for_help" ? "Needs you" : "All clear") : STATUS[activity].label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

