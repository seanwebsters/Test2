import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { currentUser } from "@/lib/auth";
import { SERIES_BY_SLUG } from "@/lib/catalog";
import { computeWrapped } from "@/lib/wrapped";

export const dynamic = "force-dynamic";

const font = (p: string) => fs.readFile(path.join(process.cwd(), "node_modules", p));

/** A 1080×1350 shareable recap card rendered on the server from real listening data. */
export async function GET() {
  const user = await currentUser();
  const w = computeWrapped(user, SERIES_BY_SLUG);
  const [display, body] = await Promise.all([
    font("@fontsource/unbounded/files/unbounded-latin-800-normal.woff"),
    font("@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff"),
  ]);
  const accent = w.favourites[0]?.color ?? "#DFFF57";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#111114", color: "#F7F4E9", padding: 80, fontFamily: "Body" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontFamily: "Display" }}>
          <div style={{ display: "flex" }}>KNOW<span style={{ color: "#DFFF57" }}>HOW</span></div>
          <div style={{ display: "flex", color: "#7C7A73" }}>BRAIN WRAPPED</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 90 }}>
          <div style={{ fontSize: 34, color: "#B9B6AC" }}>{user.displayName} is</div>
          <div style={{ fontSize: 96, fontFamily: "Display", lineHeight: 1, color: accent, marginTop: 10 }}>{w.personality.name.toUpperCase()}</div>
          <div style={{ fontSize: 36, marginTop: 24, color: "#F7F4E9" }}>{w.personality.line}</div>
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 70 }}>
          {[
            [String(w.minutes), "minutes listened"],
            [String(w.episodes), "episodes finished"],
            [String(w.longestStreak), "day best streak"],
          ].map(([v, k]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", flex: 1, background: "#1D1D22", borderRadius: 36, padding: 32 }}>
              <div style={{ fontSize: 72, fontFamily: "Display", color: "#DFFF57" }}>{v}</div>
              <div style={{ fontSize: 26, color: "#B9B6AC" }}>{k}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 50 }}>
          <div style={{ fontSize: 24, color: "#7C7A73", letterSpacing: 4 }}>FAVOURITE UNIVERSES</div>
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            {(w.favourites.length ? w.favourites : [{ id: "none", label: "Still exploring", color: "#33333C", minutes: 0 }]).map((f) => (
              <div key={f.id} style={{ display: "flex", background: f.color, color: "#111114", borderRadius: 999, padding: "14px 28px", fontSize: 30 }}>{f.label}</div>
            ))}
          </div>
        </div>
        {w.fact && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", background: "#1D1D22", borderRadius: 36, padding: 36 }}>
            <div style={{ fontSize: 22, color: "#7C7A73", letterSpacing: 4 }}>MOST SURPRISING THING I LEARNED</div>
            <div style={{ fontSize: 34, marginTop: 12, lineHeight: 1.25 }}>{w.fact.length > 160 ? `${w.fact.slice(0, 157)}…` : w.fact}</div>
          </div>
        )}
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Display", data: display, weight: 800, style: "normal" },
        { name: "Body", data: body, weight: 700, style: "normal" },
      ],
      headers: { "Content-Disposition": 'inline; filename="knowhow-brain-wrapped.png"', "Cache-Control": "private, no-store" },
    },
  );
}
