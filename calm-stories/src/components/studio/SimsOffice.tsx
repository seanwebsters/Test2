"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AGENTS, type AgentDefinition } from "@/lib/studio/agents";
import type { AgentState } from "@/lib/studio/team";
import type { AgentActivity, AgentKey } from "@/lib/studio/types";
import { cx } from "@/lib/util";

/**
 * The AI Team as a little isometric studio (Sims-style, Calm-styled). Every
 * person's place and pose comes from real workflow state: seated and typing
 * at their desk while working, dozing in their chair when idle, hand up
 * when they need you.
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
  { gx: 0, gy: 0, w: 6, d: 7, label: "Your office", floor: "#f2f3f7", alt: "#eaecf2" },
  { gx: 6, gy: 0, w: 10, d: 7, label: "Development", floor: "#f2f3f7", alt: "#eaecf2" },
  { gx: 16, gy: 0, w: 8, d: 7, label: "Story table", floor: "#f2f3f7", alt: "#eaecf2" },
  { gx: 0, gy: 7, w: 6, d: 5, label: "Quality gate", floor: "#f2f3f7", alt: "#eaecf2" },
  { gx: 6, gy: 7, w: 10, d: 5, label: "Writers' room", floor: "#f2f3f7", alt: "#eaecf2" },
  { gx: 16, gy: 7, w: 8, d: 5, label: "Art & sound", floor: "#f2f3f7", alt: "#eaecf2" },
  { gx: 0, gy: 12, w: 24, d: 6, label: "Lounge", floor: "#e6cfa9", alt: "#dcc29a" },
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
      {h > 0.1 && <polygon points={pts([e, c, c0, e0])} fill="url(#simsAO)" />}
      {h > 0.1 && <polygon points={pts([c, b, b0, c0])} fill="url(#simsAO)" />}
      <polygon points={pts([a, b, c, e])} fill={top} />
      <polyline points={pts([e, c, b])} fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.7" />
    </g>
  );
}

type Drawable = { depth: number; key: string; node: ReactNode };

/** Soft contact shadow on the floor under a footprint (light comes from the back windows). */
function Shadow({ gx, gy, w, d, k = 0.22 }: { gx: number; gy: number; w: number; d: number; k?: number }) {
  return <polygon points={pts([iso(gx - 0.05, gy), iso(gx + w + 0.1, gy), iso(gx + w + 0.25, gy + d + 0.3), iso(gx + 0.1, gy + d + 0.3)])} fill="#1b2140" opacity={k} filter="url(#simsSoft)" />;
}

function Desk({ gx, gy, lit, prop }: { gx: number; gy: number; lit: boolean; prop: AgentDefinition["bedroom"]["prop"] }): Drawable[] {
  // white desk in front of the seat, with a silver laptop whose lid faces the person
  const dx = gx - 0.9, dy = gy + 0.55;
  const top = 0.55;
  const lidBack = [iso(dx + 0.62, dy + 0.18, top + 0.04), iso(dx + 1.2, dy + 0.18, top + 0.04), iso(dx + 1.2, dy + 0.1, top + 0.42), iso(dx + 0.62, dy + 0.1, top + 0.42)] as [number, number][];
  const [gxp, gyp] = iso(dx + 0.91, dy + 0.1, top + 0.5);
  return [
    {
      depth: dx + dy + 1.6,
      key: `desk-${gx}-${gy}`,
      node: (
        <g>
          {/* slim legs + white top */}
          <Box gx={dx + 0.05} gy={dy + 0.65} w={0.06} d={0.06} h={top} top="#d9dce8" left="#b9bdcf" right="#c9cddd" />
          <Box gx={dx + 1.69} gy={dy + 0.65} w={0.06} d={0.06} h={top} top="#d9dce8" left="#b9bdcf" right="#c9cddd" />
          <Box gx={dx} gy={dy} w={1.8} d={0.8} h={0.07} z={top - 0.07} top="#f4f5fa" left="#cfd2e0" right="#e1e4ef" />
          {/* laptop base + lid (back of the lid faces us) */}
          <Box gx={dx + 0.6} gy={dy + 0.18} w={0.62} d={0.42} h={0.03} z={top} top="#d7d9e2" left="#a9adbd" right="#bfc2cf" />
          <polygon points={pts(lidBack)} fill="#c8cbd6" stroke="#9ea2b4" strokeWidth="0.6" />
          {lit && <circle cx={gxp} cy={gyp} r="2.2" fill="#ffffff" opacity="0.85" />}
          {lit && <circle cx={gxp} cy={gyp - 4} r="30" fill="url(#simsLamp)" className="sims-glow" />}
          {/* a mug and a personal touch */}
          <Box gx={dx + 1.42} gy={dy + 0.3} w={0.12} d={0.12} h={0.14} z={top} top="#f3eaff" left="#c7b8ff" right="#d8ccff" />
          <Box gx={dx + 1.56} gy={dy + 0.56} w={0.12} d={0.12} h={0.12} z={top} top="#ffffff" left="#d4d7e3" right="#e4e6ef" />
          <circle cx={iso(dx + 1.62, dy + 0.62, top + 0.3)[0]} cy={iso(dx + 1.62, dy + 0.62, top + 0.3)[1]} r="5" fill="#3f9470" />
          <circle cx={iso(dx + 1.62, dy + 0.62, top + 0.3)[0] + 3} cy={iso(dx + 1.62, dy + 0.62, top + 0.3)[1] - 3} r="3" fill="#5bbf8c" />
          <text x={iso(dx + 0.3, dy + 0.5, top + 0.1)[0]} y={iso(dx + 0.3, dy + 0.5, top + 0.1)[1]} fontSize="11" textAnchor="middle">{PROP[prop]}</text>
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
      <ellipse cx="2" cy="3" rx="14" ry="5.5" fill="#1b2140" opacity="0.3" filter="url(#simsSoft)" />
      {/* legs */}
      {sit || nap ? (
        <rect x="-8" y="-10" width="16" height="9" rx="4" fill="#2b2f55" />
      ) : (
        <>
          <g className="sims-leg-a"><rect x="-7" y="-14" width="6" height="15" rx="3" fill="#2b2f55" /><rect x="-8" y="-1" width="8" height="3.5" rx="1.7" fill="#f4f5fa" /></g>
          <g className="sims-leg-b"><rect x="1" y="-14" width="6" height="15" rx="3" fill="#2b2f55" /><rect x="0" y="-1" width="8" height="3.5" rx="1.7" fill="#f4f5fa" /></g>
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
        <image href="/brand/calm-script.png" x="-8" y="6" width="16" height="6.3" preserveAspectRatio="xMidYMid meet" />
        <path d="M-10 15 h20 v4 q0 3 -3 3 h-14 q-3 0 -3 -3z" fill="#1d2a6b" opacity="0.18" />
        <path d="M3 0 h4 q3 0 3 3 v16 q0 3 -3 3 h-4z" fill="#1d2a6b" opacity="0.14" />
      </g>
      {/* head */}
      <g transform={`translate(0 ${sit || nap ? -40 : -44}) ${nap ? "rotate(-12)" : ""}`}>
        <rect x="-3" y="7" width="6" height="5" fill={b.skin} />
        <rect x="-3" y="9" width="6" height="2" fill="#000" opacity="0.12" />
        <circle r="10" fill={b.skin} />
        <path d="M4 -8 a10 10 0 0 1 0 16 a12 12 0 0 0 0 -16z" fill="#000" opacity="0.08" />
        <circle cx="-5.5" cy="4.5" r="2" fill="#ff9aa8" opacity="0.35" />
        <circle cx="5.5" cy="4.5" r="2" fill="#ff9aa8" opacity="0.35" />
        <circle cx="-3" cy="-4" r="4" fill="#ffffff" opacity="0.08" />
        <path d="M-10 -1 a10 10 0 0 1 20 0 q-5 -4 -10 -3 q-5 -1 -10 3z" fill={b.hair} />
        <path d="M-6 -7 q4 -3 9 -1" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.5" fill="none" strokeLinecap="round" />
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
export type ReviewItem = { id: string; title: string; series: string; cover: string | null; status: "in_review" | "changes_requested" | "approved" };

const REVIEW_LABEL: Record<ReviewItem["status"], string> = { in_review: "In review", changes_requested: "Changes", approved: "Approved" };

/** Draw HTML-ish content on the front face of a panel that runs along gx at a fixed gy (pixel units on the panel). */
const faceMatrix = (gx: number, gy: number, zTop: number) => {
  const [x, y] = iso(gx, gy, zTop);
  return `matrix(1 0.5 0 1 ${x.toFixed(1)} ${y.toFixed(1)})`;
};

function ReviewRoom({ review }: { review: ReviewItem[] }) {
  const feature = review.find((r) => r.status === "in_review") ?? review[0];
  const W = 8.2 * 32, H = 1.7 * 32; // big screen face in px
  return (
    <g className="sims-live">
      {/* big screen */}
      <a href={feature ? "/studio/releases" : "/studio/approvals"}>
        <g transform={faceMatrix(2.4, 12.34, 2.08)}>
          <defs>
            <linearGradient id="simsScreenSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d2a6b" /><stop offset="1" stopColor="#4b3a78" /></linearGradient>
            <linearGradient id="simsScreenFade" x1="0" y1="0" x2="1" y2="0"><stop offset="0.35" stopColor="#0b1030" stopOpacity="0" /><stop offset="1" stopColor="#0b1030" stopOpacity="0.75" /></linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#simsScreenSky)" />
          {feature?.cover ? <image href={feature.cover} width={W} height={H} preserveAspectRatio="xMidYMid slice" /> : <><circle cx={W * 0.25} cy={H * 0.32} r="6" fill="#f3eaff" /><path d={`M0 ${H} L${W * 0.18} ${H * 0.55} L${W * 0.32} ${H * 0.78} L${W * 0.48} ${H * 0.45} L${W * 0.7} ${H} Z`} fill="#141b45" opacity="0.9" /></>}
          <rect width={W} height={H} fill="url(#simsScreenFade)" />
          <text x={W - 10} y={H * 0.42} textAnchor="end" className="sims-screen-title">{feature ? short(feature.title, 26) : "Nothing to review"}</text>
          <text x={W - 10} y={H * 0.42 + 13} textAnchor="end" className="sims-screen-sub">{feature ? `${short(feature.series, 30)} · ${REVIEW_LABEL[feature.status]}` : "New stories appear here"}</text>
        </g>
      </a>
      {/* stories ready for review */}
      <a href="/studio/releases">
        <g transform={faceMatrix(13.1, 12.32, 2.0)}>
          <text x="6" y="11" className="sims-wall-title">Stories ready for review</text>
          {review.slice(0, 4).map((r, i) => (
            <g key={r.id} transform={`translate(${8 + i * 58} 17)`}>
              <rect width="48" height="30" rx="2" fill="#2c3a7a" />
              {r.cover ? <image href={r.cover} width="48" height="30" preserveAspectRatio="xMidYMid slice" /> : <><circle cx="12" cy="9" r="3" fill="#f3eaff" /><path d="M0 30 L14 16 L24 24 L34 12 L48 30Z" fill="#141b45" /></>}
              <text x="24" y="38" textAnchor="middle" className="sims-wall-label">{REVIEW_LABEL[r.status]}</text>
            </g>
          ))}
          {review.length === 0 && <text x="6" y="30" className="sims-wall-label">All caught up</text>}
        </g>
      </a>
      {/* you, on the sofa, facing the screen */}
      {(() => {
        const [x, y] = iso(5.6, 15.55);
        return (
          <g transform={`translate(${x} ${y})`} pointerEvents="none">
            <rect x="-9" y="-26" width="18" height="16" rx="6" fill="#2b2f45" />
            <circle cx="0" cy="-34" r="9" fill="#3a2a1e" />
            <path d="M-9 -34 a9 9 0 0 1 18 0 q-4 6 -9 7 q-5 -1 -9 -7z" fill="#2a1d14" />
            <g transform="translate(0 -56)">
              <rect x="-13" y="-8" width="26" height="15" rx="7.5" fill="#1b2140" opacity="0.85" />
              <text y="3" textAnchor="middle" className="sims-you">You</text>
            </g>
          </g>
        );
      })()}
    </g>
  );
}

export function SimsOffice({ agents, onOpen, canEdit = true, review = [], legend = true, bare = false }: { agents: AgentState[]; onOpen: (key: AgentKey) => void; canEdit?: boolean; review?: ReviewItem[]; legend?: boolean; bare?: boolean }) {
  const st = (k: AgentKey) => agents.find((a) => a.key === k);
  // Walking: when someone moves between desk and lounge, show the walk cycle for the trip.
  const prevAt = useRef<Partial<Record<AgentKey, boolean>>>({});
  const [walking, setWalking] = useState<Partial<Record<AgentKey, boolean>>>({});
  const people = AGENTS.map((def) => {
    const s = st(def.key);
    const activity: AgentActivity = def.human ? (s?.activity ?? "sleeping") : (s?.activity ?? "sleeping");
    // Everyone always sits at their own desk; idle agents doze in their chair.
    const atDesk = true;
    const spot = SEAT[def.key]!;
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

  // Photoreal backdrop (Nano Banana render of the empty office, made on the server with the fal key)
  const svgRef = useRef<SVGSVGElement>(null);
  const [photo, setPhoto] = useState<string | null>(null); // saved 3D office
  const [draft, setDraft] = useState<{ url: string; prompt?: string } | null>(null); // unsaved render to review
  const [photoOn, setPhotoOn] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<null | "generate" | "refine" | "save" | "discard">(null);
  const [renderErr, setRenderErr] = useState<string | null>(null);
  const [sprites, setSprites] = useState<{ done: string[]; status: string; total: number; v: number } | null>(null);
  const [anims, setAnims] = useState<{ status: string; clips: Record<string, { aspect: number }>; total: number; error?: string; v: number } | null>(null);
  type Meta = { updated_at: string; prompt?: string; layout?: number } | null;
  const [layout, setLayout] = useState<{ saved?: number; draft?: number }>({});
  const loadInfo = async () => {
    const res = await fetch("/api/studio/office-render?info=1").catch(() => null);
    if (!res?.ok) return null;
    const info = (await res.json()) as { saved: Meta; draft: Meta; people: { done: string[]; status: string; total: number; updated_at: string } | null; anims: { status: string; clips: Record<string, { aspect: number }>; total: number; error?: string; updated_at: string } | null };
    setLayout({ saved: info.saved?.layout, draft: info.draft?.layout });
    setPhoto(info.saved ? `/api/studio/office-render?v=${encodeURIComponent(info.saved.updated_at)}` : null);
    setDraft(info.draft ? { url: `/api/studio/office-render?draft=1&v=${encodeURIComponent(info.draft.updated_at)}`, prompt: info.draft.prompt } : null);
    if (info.people) setSprites({ ...info.people, v: Date.parse(info.people.updated_at) || 0 });
    if (info.anims) setAnims({ ...info.anims, v: Date.parse(info.anims.updated_at) || 0 });
    return info;
  };
  useEffect(() => {
    void loadInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // While the 3D team is being made, check back every few seconds.
  useEffect(() => {
    if (sprites?.status !== "running" && anims?.status !== "running") return;
    const t = setInterval(() => void loadInfo(), 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprites?.status, anims?.status]);
  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } | string } & Record<string, unknown>;
    if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : json.error?.message ?? `Request failed (${res.status}).`);
    return json;
  };
  async function makePeople(redo = false) {
    const json = (await post("/api/studio/office-render/people", { redo })) as { done?: string[]; status?: string; total?: number };
    setSprites({ done: json.done ?? [], status: json.status ?? "running", total: json.total ?? 0, v: Date.now() });
  }
  /** A PNG snapshot of the empty office illustration (no people), padded to 16:9. */
  async function snapshot(): Promise<string> {
    const svg = svgRef.current;
    if (!svg) throw new Error("The office isn't on screen.");
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll(".sims-person, .sims-name, .sims-bubble-wrap, .sims-photo, .sims-live").forEach((n) => n.remove());
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(VW));
    clone.setAttribute("height", String(VH));
    const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    const img = new Image();
    await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error("Couldn't snapshot the office.")); img.src = src; });
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 900;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0a1026";
    ctx.fillRect(0, 0, 1600, 900);
    const k = 900 / VH;
    ctx.drawImage(img, (1600 - VW * k) / 2, 0, VW * k, 900);
    return canvas.toDataURL("image/png");
  }
  async function act(kind: "generate" | "refine" | "save" | "discard") {
    setBusy(kind);
    setRenderErr(null);
    try {
      if (kind === "generate") {
        const wasIllustrated = !photoOn || !(draft || photo);
        if (!wasIllustrated) setPhotoOn(false); // snapshot the layout, not the photo
        await new Promise((r) => setTimeout(r, 50));
        const snap = await snapshot();
        await post("/api/studio/office-render", { action: "generate", snapshot: snap, prompt: prompt.trim() || undefined });
      } else if (kind === "refine") {
        await post("/api/studio/office-render", { action: "refine", prompt: prompt.trim() });
      } else {
        await post("/api/studio/office-render", { action: kind });
        if (kind === "save" && !sprites?.done.length) await makePeople();
      }
      if (kind === "generate" || kind === "refine") setPrompt("");
      await loadInfo();
      setPhotoOn(true);
    } catch (err) {
      setRenderErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }
  const backdrop = draft?.url ?? photo;
  const PW = (VH * 16) / 9;

  // Each 3D team member can be animated on their own (transparent WebM clips).
  const [animBusy, setAnimBusy] = useState(false);
  const [animPrompt, setAnimPrompt] = useState("");
  const [alphaVideo, setAlphaVideo] = useState(false);
  useEffect(() => {
    // Transparent VP9 WebM plays in Chrome, Edge and Firefox; Safari keeps the still sprites.
    const v = document.createElement("video");
    setAlphaVideo(Boolean(v.canPlayType('video/webm; codecs="vp9"')) && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);
  async function animateTeam() {
    setAnimBusy(true);
    setRenderErr(null);
    try {
      const all = Boolean(anims && Object.keys(anims.clips).length >= anims.total && anims.total > 0);
      const json = (await post("/api/studio/office-render/team-animate", { direction: animPrompt.trim() || undefined, redo: all || Boolean(animPrompt.trim()) })) as unknown as NonNullable<typeof anims>;
      setAnims({ ...json, v: Date.now() });
      setAnimPrompt("");
    } catch (err) {
      setRenderErr(err instanceof Error ? err.message : String(err));
    } finally {
      setAnimBusy(false);
    }
  }
  const showPhoto = Boolean(backdrop && photoOn);
  // Renders made before the review room existed don't have the screen/wall, so don't paint over their sofas.
  const reviewBaked = !showPhoto || (draft ? layout.draft : layout.saved) === 2;

  const items: Drawable[] = [];
  const shadows: ReactNode[] = [];
  const shadow = (gx: number, gy: number, w: number, d: number, k?: number) => shadows.push(<Shadow key={`sh-${shadows.length}`} gx={gx} gy={gy} w={w} d={d} k={k} />);

  // Furniture
  for (const [k, seat] of Object.entries(SEAT) as [AgentKey, [number, number]][]) {
    const p = people.find((x) => x.def.key === k)!;
    shadow(seat[0] - 0.9, seat[1] + 0.55, 1.8, 0.8, 0.16);
    shadow(seat[0] - 0.3, seat[1] - 0.3, 0.6, 0.6, 0.18);
    items.push(...Desk({ gx: seat[0], gy: seat[1], lit: p.atDesk && p.activity !== "sleeping", prop: p.def.bedroom.prop }));
    // chair
    items.push({ depth: seat[0] + seat[1] - 0.2, key: `chair-${k}`, node: <g><Box gx={seat[0] - 0.28} gy={seat[1] - 0.28} w={0.56} d={0.56} h={0.12} z={0.26} top="#3a3d4f" left="#26283a" right="#2f3244" /><Box gx={seat[0] - 0.04} gy={seat[1] - 0.04} w={0.08} d={0.08} h={0.26} top="#8e93a6" left="#6c7086" right="#7b8096" /><Box gx={seat[0] - 0.28} gy={seat[1] - 0.32} w={0.56} d={0.1} h={0.55} z={0.38} top="#3a3d4f" left="#26283a" right="#2f3244" /></g> });
  }
  shadow(18.4, 2.2, 3.2, 2.2);
  shadow(3.0, 15.3, 3.6, 0.9); shadow(7.0, 15.3, 3.6, 0.9);
  shadow(11.4, 12.95, 1.4, 1.0, 0.28);
  // Story table + chairs
  items.push({ depth: 19 + 3 + 2.4, key: "story-table", node: <g><Box gx={18.4} gy={2.2} w={3.2} d={2.2} h={0.5} top="#f4f5fa" left="#cfd2e0" right="#e1e4ef" /><Box gx={19.3} gy={2.9} w={1.2} d={0.8} h={0.04} z={0.5} top="#f3eaff" left="#cfc6ee" right="#ddd4f7" /></g> });
  // Quality gate arch
  items.push({ depth: 1.2 + 9.6 + 0.4, key: "gate", node: <g><Box gx={0.8} gy={9.2} w={0.25} d={0.25} h={1.6} top="#f4f5fa" left="#cfd2e0" right="#e1e4ef" /><Box gx={0.8} gy={10.6} w={0.25} d={0.25} h={1.6} top="#f4f5fa" left="#cfd2e0" right="#e1e4ef" /><Box gx={0.8} gy={9.2} w={0.25} d={1.65} h={0.2} z={1.6} top="#f4f5fa" left="#cfd2e0" right="#e1e4ef" /></g> });
  // Review room (front of the studio): a big screen showing the story up for review, a wall of
  // stories by status, and sofas facing the screen where you sit to listen and approve.
  const reviewSofa = (gx: number, gy: number, len: number, key: string) => items.push({ depth: gx + gy + 0.9, key, node: <g><Box gx={gx} gy={gy} w={len} d={0.9} h={0.32} top="#d5d8e4" left="#a5a9bd" right="#b8bccd" /><Box gx={gx} gy={gy + 0.62} w={len} d={0.28} h={0.72} top="#e2e5ef" left="#a5a9bd" right="#b8bccd" />{Array.from({ length: Math.floor(len) }, (_, i) => <Box key={i} gx={gx + i + 0.08} gy={gy + 0.08} w={0.84} d={0.5} h={0.06} z={0.32} top="#e9ebf3" left="#b8bccd" right="#c9ccda" />)}</g> });
  reviewSofa(3.0, 15.3, 3.6, "sofa-1");
  reviewSofa(7.0, 15.3, 3.6, "sofa-2");
  items.push({ depth: 6 + 14.3, key: "review-table", node: <g><Box gx={4.6} gy={13.9} w={3.6} d={0.8} h={0.32} top="#f4f5fa" left="#cfd2e0" right="#e1e4ef" /><Box gx={5.0} gy={14.1} w={0.3} d={0.3} h={0.12} z={0.32} top="#ffffff" left="#d4d7e3" right="#e4e6ef" /><circle cx={iso(5.15, 14.25, 0.6)[0]} cy={iso(5.15, 14.25, 0.6)[1]} r="7" fill="url(#simsLeaf)" /></g> });
  // screen + wall frames (live content is drawn on top separately)
  items.push({ depth: 2.5 + 12.3, key: "review-screen", node: <g><Box gx={2.3} gy={12.2} w={8.4} d={0.14} h={1.85} z={0.3} top="#2a2f45" left="#1b1f30" right="#22273a" /><Box gx={5.9} gy={12.2} w={1.2} d={0.3} h={0.3} top="#d9dce8" left="#b9bdcf" right="#c9cddd" /></g> });
  items.push({ depth: 12.8 + 12.3, key: "review-wall", node: <Box gx={13.0} gy={12.2} w={7.6} d={0.1} h={1.7} z={0.35} top="#2a2f45" left="#1e2338" right="#22273a" /> });
  items.push({ depth: 13 + 13.4, key: "review-shelf", node: <Box gx={13.2} gy={12.5} w={7.2} d={0.5} h={0.32} top="#f4f5fa" left="#cfd2e0" right="#e1e4ef" /> });
  items.push({ depth: 0.6 + 14.2, key: "fire", node: <g><Box gx={0.05} gy={14.4} w={0.6} d={2.2} h={1.3} top="#f4f5fa" left="#cfd2e0" right="#e1e4ef" /><polygon points={pts([iso(0.66, 14.7, 0.35), iso(0.66, 16.3, 0.35), iso(0.66, 16.3, 0.6), iso(0.66, 14.7, 0.6)])} fill="#1b1e30" /><polygon points={pts([iso(0.66, 14.8, 0.38), iso(0.66, 16.2, 0.38), iso(0.66, 16.2, 0.55), iso(0.66, 14.8, 0.55)])} fill="#ff9a5c" className="sims-fire" /><circle cx={iso(1.4, 15.5)[0]} cy={iso(1.4, 15.5)[1]} r="46" fill="url(#simsLamp)" className="sims-glow" /></g> });
  items.push({ depth: 0.5 + 12.4, key: "shelf", node: <g><Box gx={0.05} gy={12.3} w={0.45} d={1.6} h={1.8} top="#f4f5fa" left="#cfd2e0" right="#e1e4ef" />{[12.6, 13.1, 13.6].map((y) => { const [sx, sy] = iso(0.3, y, 1.85); return <g key={y}><circle cx={sx} cy={sy - 4} r="7" fill="#3f9470" /><circle cx={sx + 4} cy={sy - 8} r="4" fill="#5bbf8c" /><path d={`M${sx - 4} ${sy} q-3 14 1 26`} stroke="#3f9470" strokeWidth="3" fill="none" strokeLinecap="round" /></g>; })}</g> });
  // Indoor trees in white planters
  for (const [i, [x, y, tall]] of ([[0.5, 0.5, 1], [6.5, 0.4, 1], [12.6, 0.4, 0], [15.4, 0.5, 1], [19.9, 0.4, 0], [23.2, 0.6, 1], [0.4, 2.0, 0], [0.5, 6.3, 0], [15.4, 7.3, 0], [23.2, 5.6, 0], [23.2, 11.3, 1], [0.6, 17.2, 1], [5.2, 17.3, 0], [18.6, 17.3, 0], [23.0, 17.0, 1], [23.1, 14.0, 0]] as [number, number, number][]).entries()) {
    const [px, py] = iso(x + 0.25, y + 0.25, 0.45);
    const h = tall ? 1 : 0.65;
    shadow(x - 0.3, y - 0.1, 1.1, 0.9, 0.14);
    items.push({
      depth: x + y + 0.6,
      key: `tree-${i}`,
      node: (
        <g>
          <Box gx={x} gy={y} w={0.5} d={0.5} h={0.45} top="#f4f5fa" left="#cfd2e0" right="#e1e4ef" />
          <path d={`M${px} ${py} l0 ${-34 * h} m0 ${12 * h} l-7 ${-12 * h} m7 ${4 * h} l6 ${-14 * h}`} stroke="#6d5642" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx={px + 2} cy={py - 46 * h} r={17 * h + 4} fill="url(#simsLeafDark)" />
          <circle cx={px - 10 * h} cy={py - 48 * h} r={12 * h + 3} fill="url(#simsLeaf)" />
          <circle cx={px + 11 * h} cy={py - 52 * h} r={11 * h + 3} fill="url(#simsLeaf)" />
          <circle cx={px - 2} cy={py - 62 * h} r={12 * h + 3} fill="url(#simsLeaf)" />
          <circle cx={px + 6} cy={py - 38 * h} r={8 * h + 2} fill="url(#simsLeafDark)" />
          <circle cx={px - 6 * h} cy={py - 66 * h} r={5 * h + 1} fill="#9ad8b2" opacity="0.35" />
        </g>
      ),
    });
  }

  // Big atrium tree in a wooden planter bench, between the lounge sofas
  {
    const [tx, ty] = iso(12.1, 13.45, 0.5);
    items.push({
      depth: 11.4 + 13.0 + 1.4,
      key: "atrium-tree",
      node: (
        <g>
          <Box gx={11.4} gy={12.95} w={1.4} d={1.0} h={0.5} top="#d9b98c" left="#a8865e" right="#c09d72" />
          <Box gx={11.5} gy={13.05} w={1.2} d={0.8} h={0.02} z={0.5} top="#6d5642" left="#5a4535" right="#5a4535" />
          <path d={`M${tx} ${ty} L${tx - 2} ${ty - 54} M${tx - 1} ${ty - 30} L${tx - 16} ${ty - 62} M${tx - 1} ${ty - 40} L${tx + 18} ${ty - 70}`} stroke="#7a6048" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {([[-30, -96, 22, "#2f7a5c"], [24, -104, 24, "#2f7a5c"], [-4, -118, 26, "#3f9470"], [-38, -72, 16, "#378a66"], [34, -78, 17, "#378a66"], [6, -84, 20, "#4fab82"], [-18, -128, 16, "#4fab82"], [20, -132, 15, "#5bbf8c"]] as [number, number, number, string][]).map(([cx, cy, r, f], i) => <circle key={i} cx={tx + cx * 0.75} cy={ty + cy * 0.75} r={r * 0.75} fill={f === "#2f7a5c" || f === "#378a66" ? "url(#simsLeafDark)" : "url(#simsLeaf)"} />)}
          {([[-14, -104], [10, -96], [4, -86], [-24, -76]] as [number, number][]).map(([cx, cy], i) => <circle key={`hl-${i}`} cx={tx + cx * 0.75} cy={ty + cy * 0.75} r="5" fill="#a8e0bd" opacity="0.3" />)}
        </g>
      ),
    });
  }

  // People
  for (const p of people) {
    const [x, y] = iso(p.spot[0], p.spot[1]);
    const pose = walking[p.def.key] ? "walk" : p.atDesk ? "seated" : "nap";
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
          aria-label={`${p.def.person}, ${p.def.name}: ${LABEL[p.activity]}${p.s?.task ? ` – ${p.s.task.label}` : ""}`}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(p.def.key)}
        >
          {p.activity === "asking_for_help" && <ellipse cx="0" cy="2" rx="22" ry="9" fill="none" stroke="#ffc96b" strokeWidth="2" className="sims-pulse" />}
          {showPhoto && sprites?.done.includes(`${p.def.key}-${p.activity === "sleeping" ? "rest" : "work"}`) ? (
            <g className={cx(pose === "walk" && "sims-walk", pose === "nap" && "sims-breathe")}>
              <ellipse cx="2" cy="3" rx="14" ry="5.5" fill="#1b2140" opacity="0.3" filter="url(#simsSoft)" />
              {(() => {
                const k = `${p.def.key}-${p.activity === "sleeping" ? "rest" : "work"}`;
                const c = alphaVideo ? anims?.clips[k] : undefined;
                if (!c) return <image href={`/api/studio/office-render/people/${k}.png?v=${sprites.v}`} x={-24} y={-60} width={48} height={64} preserveAspectRatio="xMidYMax meet" />;
                // Same footprint as the still sprite, plus the movement room the clip was cropped with.
                const sw = Math.min(48, 64 * c.aspect), sh = sw / c.aspect;
                const w = sw * 1.24, h = sh * 1.14;
                return (
                  <foreignObject x={-w / 2} y={4 - h} width={w} height={h} style={{ overflow: "visible" }}>
                    <video src={`/api/studio/office-render/people/${k}.webm?v=${anims!.v}`} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
                  </foreignObject>
                );
              })()}
            </g>
          ) : (
            <Person def={p.def} pose={pose} activity={p.activity} />
          )}
          {p.activity === "sleeping" && <text x="12" y="-56" fontSize="11" fill="#c9d6ff" className="sims-z">z</text>}
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
    <div className={bare ? "" : "overflow-hidden rounded-3xl border border-white/10"} style={bare ? undefined : { background: "linear-gradient(180deg, #7d93ea 0%, #a39be6 34%, #d5b0dd 60%, #b4b7ec 82%, #8fa6ee 100%)" }}>
      {canEdit && (
      <div className="space-y-2 border-b border-white/10 px-4 py-3 text-[12px]">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); if (!busy) void act(draft && prompt.trim() ? "refine" : "generate"); }}
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={draft ? "Describe a change to this draft… e.g. more plants, warmer lamps, add a Calm neon sign" : "Office look (optional)… e.g. cosy dusk lighting, oak floors, lots of plants"}
            className="min-w-[240px] flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] text-white placeholder:text-mist/70 focus:border-lavender/60 focus:outline-none"
            maxLength={1500}
            disabled={Boolean(busy)}
          />
          {draft && (
            <button type="submit" disabled={Boolean(busy) || !prompt.trim()} className="rounded-full bg-lavender/90 px-3 py-1.5 font-medium text-[#0b1430] hover:bg-lavender disabled:opacity-40">
              {busy === "refine" ? "Changing…" : "Change draft"}
            </button>
          )}
          <button type={draft ? "button" : "submit"} onClick={draft ? () => void act("generate") : undefined} disabled={Boolean(busy)} className={cx("rounded-full px-3 py-1.5 disabled:opacity-40", draft ? "border border-white/15 text-white/90 hover:bg-white/10" : "bg-lavender/90 font-medium text-[#0b1430] hover:bg-lavender")}>
            {busy === "generate" ? "Generating…" : draft || photo ? "New office render" : "✨ Make it 3D"}
          </button>
          {draft && (
            <>
              <button type="button" onClick={() => void act("save")} disabled={Boolean(busy)} className="rounded-full bg-emerald-400/90 px-3 py-1.5 font-medium text-[#062016] hover:bg-emerald-300 disabled:opacity-40">
                {busy === "save" ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => void act("discard")} disabled={Boolean(busy)} className="rounded-full border border-white/15 px-3 py-1.5 text-mist hover:bg-white/10 hover:text-white disabled:opacity-40">
                Discard
              </button>
            </>
          )}
        </form>
        {photo && (
          <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (!animBusy) void animateTeam(); }}>
            <input
              value={animPrompt}
              onChange={(e) => setAnimPrompt(e.target.value)}
              placeholder="How the team moves (optional)… e.g. typing busily, sipping tea, stretching"
              className="min-w-[240px] flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] text-white placeholder:text-mist/70 focus:border-lavender/60 focus:outline-none"
              maxLength={1000}
              disabled={animBusy || anims?.status === "running" || !sprites?.done.length}
            />
            {sprites?.status !== "running" && (
              <button type="button" onClick={() => makePeople(Boolean(sprites?.done.length && sprites.done.length >= sprites.total)).catch((e) => setRenderErr(e instanceof Error ? e.message : String(e)))} className="rounded-full border border-white/15 px-3 py-1.5 text-white/90 hover:bg-white/10">
                {sprites?.done.length ? (sprites.done.length >= sprites.total ? "Redo 3D team" : "Finish 3D team") : "Make 3D team"}
              </button>
            )}
            <button type="submit" disabled={animBusy || anims?.status === "running" || !sprites?.done.length || sprites.status === "running"} className="rounded-full bg-sky-300/90 px-3 py-1.5 font-medium text-[#0b1430] hover:bg-sky-200 disabled:opacity-40">
              {anims?.status === "running" ? "Animating…" : anims && Object.keys(anims.clips).length ? "🎬 Re-animate team" : "🎬 Animate team"}
            </button>
          </form>
        )}
        <p className={cx(renderErr ? "text-rose-300" : draft ? "text-amber-200" : "text-mist")}>
          {renderErr ? renderErr
            : busy === "generate" || busy === "refine" ? "Rendering the office with Nano Banana… (about 20–40s)"
            : draft ? `Draft office – not saved yet.${draft.prompt ? ` “${short(draft.prompt, 60)}”` : ""} Keep changing it, then press Save.`
            : sprites?.status === "running" ? `Making the 3D team… ${sprites.done.length}/${sprites.total}`
            : anims?.status === "running" ? `Animating the team one by one with Kling… ${Object.keys(anims.clips).length}/${anims.total} (about $0.35 each)`
            : anims?.status === "failed" && anims.error ? `Some animations failed: ${anims.error}`
            : photo && !reviewBaked ? "New: a review room with a big screen. Press “New office render” (then Save) to add it to your 3D office."
            : photo ? "Only you can see these controls – your team sees just the office." : "Type a look (optional) and press Make it 3D."}
        </p>
      </div>
      )}
      <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="sims-office block w-full" role="img" aria-label="The AI team in the studio">
        <defs>
          <radialGradient id="simsLamp"><stop offset="0" stopColor="#ffe3b8" stopOpacity="0.28" /><stop offset="1" stopColor="#ffd9a0" stopOpacity="0" /></radialGradient>
          <linearGradient id="simsSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a9c9ee" /><stop offset="1" stopColor="#e3eefa" /></linearGradient>
          <linearGradient id="simsAO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1030" stopOpacity="0" /><stop offset="1" stopColor="#0b1030" stopOpacity="0.16" /></linearGradient>
          <radialGradient id="simsLeaf" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stopColor="#7fd0a0" /><stop offset="0.55" stopColor="#3f9470" /><stop offset="1" stopColor="#2a6e52" /></radialGradient>
          <radialGradient id="simsLeafDark" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stopColor="#4fab82" /><stop offset="1" stopColor="#1f5a42" /></radialGradient>
          <linearGradient id="simsSun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff4d6" stopOpacity="0.85" /><stop offset="1" stopColor="#fff4d6" stopOpacity="0" /></linearGradient>
          <linearGradient id="simsWallL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e4e6ef" /><stop offset="1" stopColor="#cfd3e1" /></linearGradient>
          <linearGradient id="simsWallR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f1f2f7" /><stop offset="1" stopColor="#dde0ea" /></linearGradient>
          <linearGradient id="simsGlassShine" x1="0" y1="0" x2="1" y2="1"><stop offset="0.3" stopColor="#ffffff" stopOpacity="0" /><stop offset="0.45" stopColor="#ffffff" stopOpacity="0.45" /><stop offset="0.55" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
          <filter id="simsSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="simsSunBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
          <linearGradient id="calmTee" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#60ade6" /><stop offset="1" stopColor="#6467e1" /></linearGradient>
        </defs>
        {showPhoto && <image className="sims-photo" style={{ filter: "drop-shadow(0 28px 34px rgba(38, 28, 96, 0.38))" }} href={backdrop!} x={-(PW - VW) / 2} y={0} width={PW} height={VH} preserveAspectRatio="none" />}
        {!showPhoto && <>
        {/* walls */}
        <polygon points={pts(backLeft)} fill="url(#simsWallL)" />
        <polygon points={pts(backRight)} fill="url(#simsWallR)" />
        {[3, 9, 15, 21].map((gx) => (
          <g key={`wr-${gx}`}>
            <polygon points={pts([iso(gx, 0, 0.15), iso(gx + 2.4, 0, 0.15), iso(gx + 2.4, 0, 2.35), iso(gx, 0, 2.35)])} fill="url(#simsSky)" stroke="#9aa0b8" strokeWidth="2" />
            <polygon points={pts([iso(gx, 0, 0.15), iso(gx + 2.4, 0, 0.15), iso(gx + 2.4, 0, 2.35), iso(gx, 0, 2.35)])} fill="url(#simsGlassShine)" />
            <line x1={iso(gx + 1.2, 0, 0.15)[0]} y1={iso(gx + 1.2, 0, 0.15)[1]} x2={iso(gx + 1.2, 0, 2.35)[0]} y2={iso(gx + 1.2, 0, 2.35)[1]} stroke="#9aa0b8" strokeWidth="1.5" />
          </g>
        ))}
        {[4, 10, 15].map((gy) => (
          <polygon key={`wl-${gy}`} points={pts([iso(0, gy, 0.15), iso(0, gy + 2.4, 0.15), iso(0, gy + 2.4, 2.35), iso(0, gy, 2.35)])} fill="url(#simsSky)" stroke="#9aa0b8" strokeWidth="2" />
        ))}
        {[4, 10, 15].map((gy) => (
          <polygon key={`wls-${gy}`} points={pts([iso(0, gy, 0.15), iso(0, gy + 2.4, 0.15), iso(0, gy + 2.4, 2.35), iso(0, gy, 2.35)])} fill="url(#simsGlassShine)" />
        ))}
        {/* floors: large pale stone tiles in the work areas, light oak planks in the lounge */}
        {ZONES.map((z) => {
          const wood = z.label === "Lounge";
          const lines: ReactNode[] = [];
          if (wood) {
            for (let k = 1; k < z.d * 4; k++) {
              const y = z.gy + k / 4;
              lines.push(<line key={`p${k}`} x1={iso(z.gx, y)[0]} y1={iso(z.gx, y)[1]} x2={iso(z.gx + z.w, y)[0]} y2={iso(z.gx + z.w, y)[1]} stroke="#b8976c" strokeOpacity="0.35" strokeWidth="0.8" />);
              for (let x = z.gx + ((k * 1.7) % 3); x < z.gx + z.w; x += 3) {
                const [x1, y1] = iso(x, y - 0.25), [x2, y2] = iso(x, y);
                lines.push(<line key={`j${k}-${x}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b8976c" strokeOpacity="0.35" strokeWidth="0.8" />);
              }
            }
          } else {
            for (let x = z.gx + 2; x < z.gx + z.w; x += 2) lines.push(<line key={`x${x}`} x1={iso(x, z.gy)[0]} y1={iso(x, z.gy)[1]} x2={iso(x, z.gy + z.d)[0]} y2={iso(x, z.gy + z.d)[1]} stroke="#dfe2ea" strokeWidth="1" />);
            for (let y = z.gy + 2; y < z.gy + z.d; y += 2) lines.push(<line key={`y${y}`} x1={iso(z.gx, y)[0]} y1={iso(z.gx, y)[1]} x2={iso(z.gx + z.w, y)[0]} y2={iso(z.gx + z.w, y)[1]} stroke="#dfe2ea" strokeWidth="1" />);
          }
          return (
            <g key={z.label}>
              <polygon points={pts([iso(z.gx, z.gy), iso(z.gx + z.w, z.gy), iso(z.gx + z.w, z.gy + z.d), iso(z.gx, z.gy + z.d)])} fill={z.floor} stroke={z.floor} strokeWidth="0.6" />
              {lines}
            </g>
          );
        })}
        {/* the floor slab's front edges */}
        <polygon points={pts([iso(0, GY), iso(GX, GY), [iso(GX, GY)[0], iso(GX, GY)[1] + 14], [iso(0, GY)[0], iso(0, GY)[1] + 14]])} fill="#c9b08a" />
        <polygon points={pts([iso(GX, 0), iso(GX, GY), [iso(GX, GY)[0], iso(GX, GY)[1] + 14], [iso(GX, 0)[0], iso(GX, 0)[1] + 14]])} fill="#d6d9e3" />
        <polygon points={pts([iso(GX, 12), iso(GX, GY), [iso(GX, GY)[0], iso(GX, GY)[1] + 14], [iso(GX, 12)[0], iso(GX, 12)[1] + 14]])} fill="#bfa47c" />
        {/* skirting boards */}
        <polygon points={pts([iso(0, 0), iso(GX, 0), iso(GX, 0, 0.08), iso(0, 0, 0.08)])} fill="#ffffff" opacity="0.8" />
        <polygon points={pts([iso(0, 0), iso(0, GY), iso(0, GY, 0.08), iso(0, 0, 0.08)])} fill="#ffffff" opacity="0.7" />
        {/* sunlight falling through the windows */}
        <g filter="url(#simsSunBlur)">
          {[3, 9, 15, 21].map((gx) => <polygon key={`sun-r-${gx}`} points={pts([iso(gx, 0.1), iso(gx + 2.4, 0.1), iso(gx + 3.6, 3.6), iso(gx + 1.2, 3.6)])} fill="url(#simsSun)" opacity="0.7" />)}
          {[4, 10, 15].map((gy) => <polygon key={`sun-l-${gy}`} points={pts([iso(0.1, gy), iso(0.1, gy + 2.4), iso(3.4, gy + 3.4), iso(3.4, gy + 1)])} fill="url(#simsSun)" opacity="0.55" />)}
        </g>
        {/* contact shadows */}
        <g>{shadows}</g>
        {/* low room dividers (walls-down view) with doorways */}
        {[[6, 0, 2.6], [6, 4.4, 2.6], [16, 0, 2.6], [16, 4.4, 2.6], [6, 7.2, 1.8], [6, 10.2, 1.8], [16, 7.2, 1.8], [16, 10.2, 1.8]].map(([gx, gy, d]) => (
          <g key={`glass-${gx}-${gy}`} opacity="0.9">
            <Box gx={gx!} gy={gy!} w={0.05} d={d!} h={1.25} top="#cfe0f7" left="rgba(150,190,240,0.2)" right="rgba(170,205,245,0.28)" />
            <Box gx={gx!} gy={gy!} w={0.05} d={d!} h={0.06} z={1.25} top="#cfe0f7" left="#aac0e2" right="#bcd0ec" />
            <Box gx={gx!} gy={gy! + d! - 0.06} w={0.06} d={0.06} h={1.3} top="#e6e8ef" left="#a9adbd" right="#c4c7d4" />
          </g>
        ))}
        </>}
        {/* everything else, back to front (just the people over the photo) */}
        {items.filter((it) => !showPhoto || it.key.startsWith("person-")).map((it) => <g key={it.key}>{it.node}</g>)}
        {/* live review room content (kept out of the 3D render snapshot, drawn over both looks) */}
        {reviewBaked && <ReviewRoom review={review} />}
        {/* name tags on top */}
        {people.map((p) => {
          const [x, y] = iso(p.spot[0], p.spot[1]);
          return <text key={`n-${p.def.key}`} x={x} y={y - 68} textAnchor="middle" className="sims-name" pointerEvents="none" style={{ transition: "x 2.4s, y 2.4s" }}>{p.def.person} · {p.def.name}</text>;
        })}
        {/* thought bubbles on top */}
        {people.map((p) => {
          const text = p.activity === "asking_for_help" ? "✉️ Email for you" : p.atDesk && p.s?.task ? short(p.s.task.label) : p.activity === "thinking" ? "Thinking…" : null;
          if (!text || walking[p.def.key]) return null;
          const [x, y] = iso(p.spot[0], p.spot[1]);
          return (
            <g key={`b-${p.def.key}`} className="sims-bubble-wrap" transform={`translate(${x} ${y - 92})`} pointerEvents="none">
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
      {legend && <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 px-4 py-3 text-[12px]">
        {people.map(({ def, activity }) => (
          <li key={def.key}>
            <button onClick={() => onOpen(def.key)} className="flex items-center gap-1.5 hover:text-white">
              <span className="h-2 w-2 rounded-full" style={{ background: GEM[activity === "asking_for_help" ? "help" : activity !== "sleeping" ? "work" : "rest"][1] }} />
              <span className="text-white/90">{def.person} · {def.name}</span>
              <span className={activity === "asking_for_help" ? "text-amber-200" : activity !== "sleeping" ? "text-lavender" : "text-mist"}>· {def.human ? (activity === "asking_for_help" ? "Needs you" : "All clear") : LABEL[activity]}</span>
            </button>
          </li>
        ))}
      </ul>}
    </div>
  );
}
