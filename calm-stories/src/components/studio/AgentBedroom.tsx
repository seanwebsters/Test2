import type { AgentDefinition } from "@/lib/studio/agents";
import type { AgentActivity } from "@/lib/studio/types";
import { hashString } from "@/lib/util";

/**
 * A tiny person tucked up in their own bedroom. The pose and animation come
 * from the agent's real workflow state (see lib/studio/team.ts):
 *   sleeping → idle · reading → reviewing · typing → generating
 *   thinking → planning · handing_off → passing work on
 *   celebrating → just finished · asking_for_help → blocked / needs approval
 */
export function AgentBedroom({ agent, activity, className }: { agent: Pick<AgentDefinition, "key" | "bedroom" | "name">; activity: AgentActivity; className?: string }) {
  const b = agent.bedroom;
  const h = hashString(agent.key);
  const hairStyle = (["bob", "curly", "bun", "short", "long"] as const)[h % 5] ?? "bob";
  const id = `br-${agent.key}`;
  const eyesOpen = activity !== "sleeping";
  const happy = activity === "celebrating";
  const armsUp = activity === "celebrating";
  const handUp = activity === "asking_for_help";
  const wood = ["#5b3b2a", "#4a3226", "#6a4530", "#3f2b22"][h % 4] ?? "#5b3b2a";
  const wall = ["#16203f", "#1a1d3d", "#14223a", "#1d1a38"][h % 4] ?? "#16203f";
  return (
    <svg viewBox="0 0 320 200" className={`agent-room activity-${activity} ${className ?? ""}`} role="img" aria-label={`${agent.name} – ${activity.replace("_", " ")}`}>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={wall} />
          <stop offset="1" stopColor="#0c1226" />
        </linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1636" />
          <stop offset="1" stopColor="#27346e" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#ffb86b" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffb86b" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-pat`} width="14" height="14" patternUnits="userSpaceOnUse">
          <BlanketMotif prop={b.prop} accent={b.accent} />
        </pattern>
        <clipPath id={`${id}-win`}>
          <path d="M206 92 V44 a34 34 0 0 1 68 0 V92 Z" />
        </clipPath>
      </defs>

      {/* Room */}
      <rect width="320" height="152" fill={`url(#${id}-wall)`} />
      <rect y="152" width="320" height="48" fill={wood} />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="0" y1={160 + i * 10} x2="320" y2={160 + i * 10} stroke="#000" strokeOpacity="0.18" />
      ))}
      <rect y="150" width="320" height="3" fill="#000" opacity="0.25" />

      {/* Window with the night outside */}
      <g transform="translate(42 -2)">
      <g clipPath={`url(#${id}-win)`}>
        <rect x="200" y="0" width="80" height="100" fill={`url(#${id}-sky)`} />
        <circle cx="256" cy="34" r="8" fill="#f5e7bd" />
        <circle cx="259" cy="32" r="7" fill="#27346e" opacity="0.25" />
        {[
          [214, 30],
          [226, 52],
          [240, 22],
          [268, 62],
          [218, 74],
          [250, 80],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1" fill="#fff" className="br-twinkle" style={{ animationDelay: `${i * 0.7}s` }} />
        ))}
        <path d="M200 92 L222 70 L236 82 L252 64 L280 92 Z" fill="#141b3d" />
      </g>
      <path d="M206 92 V44 a34 34 0 0 1 68 0 V92 Z" fill="none" stroke={wood} strokeWidth="4" />
      <line x1="240" y1="10" x2="240" y2="92" stroke={wood} strokeWidth="2" />
      <rect x="200" y="91" width="80" height="5" rx="2" fill={wood} />
      <path d="M198 8 q-8 40 4 86 l-10 0 q-6 -44 0 -86z" fill={b.blanket} opacity="0.85" />
      <path d="M282 8 q8 40 -4 86 l10 0 q6 -44 0 -86z" fill={b.blanket} opacity="0.85" />
      </g>

      <g transform="translate(-30 -8)">
        <WallDecor prop={b.prop} accent={b.accent} wood={wood} />
      </g>

      {/* Lamp and its warm glow */}
      <circle cx="46" cy="104" r="78" fill={`url(#${id}-glow)`} className="br-glow" />
      <rect x="24" y="122" width="44" height="34" rx="3" fill={wood} />
      <rect x="24" y="122" width="44" height="5" fill="#000" opacity="0.2" />
      <rect x="44" y="104" width="4" height="18" fill="#c9a77a" />
      <path d="M32 106 L60 106 L54 88 L38 88 Z" fill="#ffd9a0" />
      <path d="M32 106 L60 106 L54 88 L38 88 Z" fill="#fff" opacity="0.25" className="br-glow" />
      <rect x="30" y="114" width="10" height="8" rx="1" fill={b.accent} opacity="0.8" />
      <rect x="41" y="116" width="2" height="6" fill="#f5f0e6" />

      {/* Bed, person and their state – drawn larger so the little people read clearly */}
      <g transform="translate(164 168) scale(1.15) translate(-164 -168)">
      {/* Bed */}
      <rect x="92" y="74" width="144" height="70" rx="22" fill={wood} />
      <rect x="102" y="84" width="124" height="44" rx="14" fill="#000" opacity="0.18" />
      <rect x="86" y="128" width="160" height="34" rx="8" fill="#e9e3f3" />
      <rect x="90" y="160" width="8" height="10" fill={wood} />
      <rect x="234" y="160" width="8" height="10" fill={wood} />
      <ellipse cx="164" cy="114" rx="38" ry="15" fill="#f4effb" />
      <ellipse cx="164" cy="118" rx="36" ry="9" fill="#d9d1ea" opacity="0.5" />

      {/* Little person */}
      <g className="br-person">
        <path d="M138 134 q26 -18 52 0 v10 h-52z" fill={b.accent} opacity="0.9" />
        <Hair style={hairStyle} color={b.hair} back />
        <circle cx="164" cy="104" r="15" fill={b.skin} />
        <Hair style={hairStyle} color={b.hair} />
        {eyesOpen && !happy ? (
          <g className={activity === "thinking" ? "br-eyes-up" : activity === "reading" || activity === "typing" ? "br-eyes-down" : ""}>
            <ellipse cx="158" cy="105" rx="1.7" ry="2" fill="#2a1a22" />
            <ellipse cx="170" cy="105" rx="1.7" ry="2" fill="#2a1a22" />
          </g>
        ) : happy ? (
          <g stroke="#2a1a22" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M155 106 q3 -3 6 0" />
            <path d="M167 106 q3 -3 6 0" />
          </g>
        ) : (
          <g stroke="#2a1a22" strokeWidth="1.3" fill="none" strokeLinecap="round">
            <path d="M155 105 q3 2.4 6 0" />
            <path d="M167 105 q3 2.4 6 0" />
          </g>
        )}
        <circle cx="153.5" cy="110" r="2.6" fill="#ff9fb3" opacity="0.55" />
        <circle cx="174.5" cy="110" r="2.6" fill="#ff9fb3" opacity="0.55" />
        <path d={happy ? "M160 111 q4 4 8 0" : "M161.5 112 q2.5 1.8 5 0"} stroke="#7a3b45" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {b.prop === "spectacles" || b.prop === "magnifier" ? <Spectacles /> : null}
        {b.prop === "headphones" ? <Headphones color={b.accent} /> : null}
        {b.prop === "crown" ? <path d="M154 92 l3 -8 l4 5 l3 -7 l3 7 l4 -5 l3 8z" fill="#f5d48a" stroke="#c99a3b" strokeWidth="0.6" /> : null}
      </g>

      {/* Blanket (breathes while sleeping) */}
      <g className="br-blanket">
        <path d="M84 132 q80 -12 164 0 v34 q-82 8 -164 0z" fill={b.blanket} />
        <path d="M84 132 q80 -12 164 0 v34 q-82 8 -164 0z" fill={`url(#${id}-pat)`} opacity="0.45" />
        <path d="M84 132 q80 -12 164 0 v7 q-82 -10 -164 0z" fill="#fff" opacity="0.22" />
      </g>

      {/* Hands and prop */}
      <g className="br-hands">
        {armsUp ? (
          <>
            <circle cx="140" cy="96" r="4.6" fill={b.skin} className="br-wave-l" />
            <circle cx="188" cy="96" r="4.6" fill={b.skin} className="br-wave-r" />
          </>
        ) : (
          <>
            <circle cx="148" cy="130" r="4.6" fill={b.skin} className="br-hand-l" />
            {handUp ? <circle cx="190" cy="94" r="4.6" fill={b.skin} className="br-raise" /> : <circle cx="180" cy="130" r="4.6" fill={b.skin} className="br-hand-r" />}
          </>
        )}
        {!armsUp && <Prop prop={b.prop} accent={b.accent} activity={activity} />}
      </g>

      {/* State overlays */}
      {activity === "sleeping" && (
        <g fill="#cfd8ff" fontFamily="Georgia, serif" fontStyle="italic">
          <text x="184" y="94" fontSize="9" className="br-z" style={{ animationDelay: "0s" }}>z</text>
          <text x="190" y="84" fontSize="11" className="br-z" style={{ animationDelay: "1s" }}>z</text>
          <text x="197" y="72" fontSize="13" className="br-z" style={{ animationDelay: "2s" }}>z</text>
        </g>
      )}
      {activity === "thinking" && (
        <g className="br-think">
          <circle cx="184" cy="90" r="2" fill="#e9e6ff" />
          <circle cx="190" cy="81" r="3" fill="#e9e6ff" />
          <ellipse cx="208" cy="64" rx="19" ry="12" fill="#e9e6ff" />
          {[200, 208, 216].map((x, i) => (
            <circle key={x} cx={x} cy="64" r="2" fill="#4a3f7a" className="br-dot" style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
        </g>
      )}
      {activity === "asking_for_help" && (
        <g className="br-help">
          <circle cx="164" cy="104" r="26" fill="#ffc96b" opacity="0.12" />
          <rect x="196" y="58" width="22" height="20" rx="6" fill="#ffc96b" />
          <path d="M200 77 l-4 8 l9 -7z" fill="#ffc96b" />
          <text x="207" y="73" fontSize="14" fontWeight="700" textAnchor="middle" fill="#3b2a12">!</text>
        </g>
      )}
      {activity === "handing_off" && (
        <g className="br-letter">
          <rect x="176" y="118" width="18" height="12" rx="1.5" fill="#fff6e6" stroke="#d9b98a" strokeWidth="0.8" />
          <path d="M176 118 l9 7 l9 -7" fill="none" stroke="#d9b98a" strokeWidth="0.8" />
          <circle cx="185" cy="125" r="1.6" fill="#c0504d" />
        </g>
      )}
      {activity === "celebrating" &&
        [
          [140, 78, "#ffd36b"],
          [188, 74, "#ffb3cf"],
          [130, 96, "#a8c8ff"],
          [198, 98, "#c7b8ff"],
          [164, 70, "#9be3d0"],
        ].map(([x, y, c], i) => <path key={i} d={star(Number(x), Number(y), 4)} fill={String(c)} className="br-spark" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </g>
    </svg>
  );
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

function Hair({ style, color, back }: { style: "bob" | "curly" | "bun" | "short" | "long"; color: string; back?: boolean }) {
  if (back) {
    if (style === "long") return <path d="M147 100 q-3 18 2 30 h30 q5 -12 2 -30z" fill={color} />;
    if (style === "bob") return <path d="M148 100 q-2 12 2 18 h28 q4 -6 2 -18z" fill={color} />;
    if (style === "curly") return <g fill={color}>{[148, 156, 164, 172, 180].map((x) => <circle key={x} cx={x} cy={112} r="5" />)}</g>;
    return null;
  }
  return (
    <g fill={color}>
      <path d="M149 103 a15 15 0 0 1 30 0 q-6 -7 -15 -7 q-9 0 -15 7z" />
      <path d="M150 99 q8 -10 22 -6 q-6 2 -9 6z" opacity="0.6" />
      {style === "bun" && <circle cx="164" cy="86" r="6.5" />}
      {style === "curly" && [152, 158, 164, 170, 176].map((x, i) => <circle key={x} cx={x} cy={91 + (i % 2) * 2} r="4.2" />)}
      {style === "short" && <path d="M150 100 q14 -8 28 0 q-2 -6 -14 -7 q-12 1 -14 7z" />}
    </g>
  );
}

function Spectacles() {
  return (
    <g fill="none" stroke="#3a2a1a" strokeWidth="1">
      <circle cx="158" cy="105" r="4" />
      <circle cx="170" cy="105" r="4" />
      <path d="M162 105 h4" />
    </g>
  );
}

function Headphones({ color }: { color: string }) {
  return (
    <g>
      <path d="M148 104 a16 16 0 0 1 32 0" fill="none" stroke="#2b2b3f" strokeWidth="2.6" />
      <rect x="145" y="101" width="6" height="10" rx="2.5" fill={color} />
      <rect x="177" y="101" width="6" height="10" rx="2.5" fill={color} />
    </g>
  );
}

function BlanketMotif({ prop, accent }: { prop: AgentDefinition["bedroom"]["prop"]; accent: string }) {
  if (prop === "moon") return <g fill={accent}><path d="M5 5 a3 3 0 1 0 3 4 a2.3 2.3 0 1 1 -3 -4z" /><circle cx="11" cy="11" r="0.9" /></g>;
  if (prop === "romance_book") return <path d="M7 10 l-3 -3 a1.6 1.6 0 0 1 3 -1.6 a1.6 1.6 0 0 1 3 1.6z" fill={accent} />;
  if (prop === "headphones" || prop === "mixer") return <path d="M2 7 q2 -3 4 0 t4 0 t4 0" fill="none" stroke={accent} strokeWidth="0.8" />;
  return <g fill={accent}><circle cx="3.5" cy="3.5" r="1" /><circle cx="10.5" cy="10.5" r="1" /></g>;
}

function WallDecor({ prop, accent, wood }: { prop: AgentDefinition["bedroom"]["prop"]; accent: string; wood: string }) {
  switch (prop) {
    case "map":
      return (
        <g>
          <rect x="96" y="18" width="54" height="40" rx="2" fill="#e9dcc0" transform="rotate(-3 123 38)" />
          <path d="M102 44 q10 -14 20 -4 t22 -8" fill="none" stroke="#7a5a3a" strokeWidth="1" strokeDasharray="2 2" transform="rotate(-3 123 38)" />
          <circle cx="134" cy="30" r="2" fill="#c0504d" />
        </g>
      );
    case "palette":
      return (
        <g>
          {[0, 1, 2].map((i) => <rect key={i} x={98 + i * 20} y={20 + (i % 2) * 6} width="16" height="22" rx="1.5" fill={["#f2c9a0", "#8a6fb3", "#2a4a6b"][i]} stroke="#fff" strokeOpacity="0.6" />)}
        </g>
      );
    case "headphones":
    case "mixer":
      return <path d="M98 40 q6 -16 12 0 t12 0 t12 0 t12 0" fill="none" stroke={accent} strokeWidth="2" opacity="0.7" />;
    case "chart":
      return (
        <g>
          <rect x="98" y="18" width="48" height="36" rx="3" fill="#1f2b4f" stroke={accent} strokeOpacity="0.5" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={104 + i * 10} y={46 - i * 6 - 6} width="6" height={i * 6 + 6} fill={accent} opacity="0.8" />)}
        </g>
      );
    case "moon":
      return <g fill="#e6e9ff" opacity="0.8">{[[104, 26], [124, 18], [140, 34], [112, 44]].map(([x, y], i) => <path key={i} d={star(x!, y!, 3)} />)}</g>;
    case "romance_book":
      return <path d="M118 36 l-9 -9 a5 5 0 0 1 9 -5 a5 5 0 0 1 9 5z" fill="#ffb3cf" opacity="0.8" />;
    default:
      return (
        <g>
          <rect x="98" y="40" width="54" height="4" fill={wood} />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={102 + i * 9} y={24 + (i % 2) * 3} width="7" height={16 - (i % 2) * 3} fill={[accent, "#e9dcc0", "#8a6fb3", "#c0504d", "#2a4a6b"][i]} opacity="0.85" />)}
        </g>
      );
  }
}

function Prop({ prop, accent, activity }: { prop: AgentDefinition["bedroom"]["prop"]; accent: string; activity: AgentActivity }) {
  const busy = activity === "typing" || activity === "reading";
  switch (prop) {
    case "laptop":
    case "mixer":
      return (
        <g>
          <path d="M150 118 h28 l3 12 h-34z" fill="#2b2f45" />
          <rect x="151" y="106" width="26" height="14" rx="1.5" fill="#3a3f5c" />
          <rect x="153" y="108" width="22" height="10" rx="1" fill={accent} opacity={busy ? 0.9 : 0.35} className={busy ? "br-screen" : ""} />
          {prop === "mixer" && [156, 162, 168, 174].map((x, i) => <rect key={x} x={x - 0.6} y={110 + (i % 3) * 2} width="1.2" height="5" fill="#fff" />)}
        </g>
      );
    case "romance_book":
    case "notebook":
    case "spectacles":
      return (
        <g>
          <path d="M146 116 q9 -4 18 0 v14 q-9 -4 -18 0z" fill="#fbf4e6" />
          <path d="M164 116 q9 -4 18 0 v14 q-9 -4 -18 0z" fill="#f3e8d2" className={activity === "reading" ? "br-page" : ""} />
          <path d="M146 130 q9 -4 18 0 q9 -4 18 0 v2 q-9 -4 -18 0 q-9 -4 -18 0z" fill={prop === "romance_book" ? "#c2185b" : accent} />
          {[0, 1, 2].map((i) => <line key={i} x1="149" y1={120 + i * 3} x2="161" y2={119 + i * 3} stroke="#b8a98a" strokeWidth="0.6" />)}
        </g>
      );
    case "map":
    case "blueprint":
      return (
        <g>
          <rect x="144" y="114" width="40" height="18" rx="1" fill={prop === "map" ? "#e9dcc0" : "#2a4f82"} />
          <path d="M157 114 v18 M171 114 v18" stroke="#000" strokeOpacity="0.15" />
          <path d={prop === "map" ? "M148 126 q8 -8 16 -2 t16 -4" : "M148 118 h12 v8 h14 v-6"} fill="none" stroke={prop === "map" ? "#7a5a3a" : "#cfe6ff"} strokeWidth="0.9" strokeDasharray={prop === "map" ? "2 1.5" : ""} />
        </g>
      );
    case "quill":
      return (
        <g>
          <rect x="148" y="116" width="26" height="16" rx="1" fill="#fbf4e6" />
          {[0, 1, 2].map((i) => <line key={i} x1="151" y1={120 + i * 3.5} x2="170" y2={120 + i * 3.5} stroke="#b8a98a" strokeWidth="0.6" />)}
          <path d="M176 128 l10 -18 q2 4 -6 18z" fill="#fff" stroke="#b8a98a" strokeWidth="0.5" className={busy ? "br-quill" : ""} />
        </g>
      );
    case "magnifier":
      return (
        <g>
          <rect x="146" y="116" width="26" height="16" rx="1" fill="#fbf4e6" />
          <circle cx="176" cy="118" r="6" fill="#cfe6ff" fillOpacity="0.4" stroke="#8a6a3a" strokeWidth="1.6" className={busy ? "br-scan" : ""} />
          <line x1="180" y1="122" x2="186" y2="128" stroke="#8a6a3a" strokeWidth="2" />
        </g>
      );
    case "palette":
      return (
        <g>
          <path d="M146 124 q4 -12 22 -10 q14 2 12 10 q-2 6 -8 4 q-4 -1 -4 3 q0 5 -8 5 q-16 0 -14 -12z" fill="#e9d2a8" />
          {[["#c0504d", 153, 120], ["#2a4a6b", 160, 117], ["#f2c94c", 168, 118], ["#8a6fb3", 152, 127]].map(([c, x, y]) => <circle key={String(c)} cx={Number(x)} cy={Number(y)} r="2" fill={String(c)} />)}
          <line x1="178" y1="112" x2="188" y2="102" stroke="#8a5a3a" strokeWidth="1.4" className={busy ? "br-quill" : ""} />
        </g>
      );
    case "chart":
    case "clapper":
      return (
        <g>
          <rect x="148" y="112" width="30" height="20" rx="2" fill={prop === "clapper" ? "#2b2b3f" : "#e9e6ff"} />
          {prop === "clapper" ? (
            <path d="M148 112 l30 0 l0 -5 l-30 0z M152 107 l4 5 M160 107 l4 5 M168 107 l4 5" fill="#f5f0e6" stroke="#2b2b3f" strokeWidth="0.8" className={busy ? "br-clap" : ""} />
          ) : (
            <path d="M151 128 l7 -6 l6 3 l10 -9" fill="none" stroke={accent} strokeWidth="1.6" />
          )}
        </g>
      );
    case "shield":
      return (
        <g>
          <rect x="146" y="116" width="24" height="16" rx="1" fill="#fbf4e6" />
          <path d="M176 112 l8 3 v6 q0 6 -8 9 q-8 -3 -8 -9 v-6z" fill={accent} />
          <path d="M172 121 l3 3 l5 -6" fill="none" stroke="#3b3a1a" strokeWidth="1.3" />
        </g>
      );
    case "headphones":
      return (
        <g>
          <rect x="150" y="118" width="26" height="12" rx="3" fill="#2b2b3f" />
          <circle cx="158" cy="124" r="3.2" fill="#1a1a1a" className={busy ? "br-spin" : ""} />
          <circle cx="158" cy="124" r="1" fill={accent} />
          <rect x="164" y="121" width="9" height="1.5" fill={accent} />
          <rect x="164" y="125" width="6" height="1.5" fill={accent} opacity="0.7" />
        </g>
      );
    case "moon":
      return (
        <g>
          <rect x="148" y="116" width="26" height="16" rx="1" fill="#fbf4e6" />
          {[0, 1, 2].map((i) => <line key={i} x1="151" y1={120 + i * 3.5} x2="170" y2={120 + i * 3.5} stroke="#b8a98a" strokeWidth="0.6" />)}
          <path d="M180 116 a5 5 0 1 0 5 7 a4 4 0 1 1 -5 -7z" fill="#f5e7bd" />
        </g>
      );
    case "crown":
    default:
      return (
        <g>
          <rect x="148" y="116" width="28" height="16" rx="1" fill="#fbf4e6" />
          <path d="M152 124 h14 M152 128 h10" stroke="#b8a98a" strokeWidth="0.7" />
          <circle cx="170" cy="127" r="3" fill="#c0504d" />
        </g>
      );
  }
}
