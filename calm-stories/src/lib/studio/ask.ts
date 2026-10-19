import "server-only";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { diskUsage } from "@/lib/services/disk";
import { callClaude } from "./llm";
import { studioBoard } from "./now";
import { providerStatus } from "./providers";
import { getStudioSettings } from "./settings";

const gb = (b: number) => `${(b / 1e9).toFixed(2)} GB`;

/** A plain-text snapshot of the studio's live state, for answering "why" questions. */
export async function studioSnapshot(now = new Date()): Promise<string> {
  const db = getDb();
  const d = diskUsage({ breakdown: true });
  const board = await studioBoard(now);
  const settings = await getStudioSettings();
  const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const errors = (await db.list("workflow_steps", { where: { status: ["failed", "blocked", "waiting"] } }))
    .filter((s) => s.error && s.updated_at >= since)
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, 15);
  const usage = await db.list("usage_records");
  const spend = (from: string) => usage.filter((u) => u.created_at >= from).reduce((n, u) => n + u.cost_cents, 0) / 100;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return [
    `# Storage (measured live by the app on the disk it writes to)`,
    `Data directory: ${env.dataDir} · storage backend: ${env.storageBackend} · RAILWAY_VOLUME_MOUNT_PATH: ${process.env.RAILWAY_VOLUME_MOUNT_PATH ?? "not set (no Railway volume attached)"}`,
    d ? `Disk the app sees: ${gb(d.totalBytes)} total, ${gb(d.usedBytes)} used, ${gb(d.freeBytes)} free. By folder: ${Object.entries(d.byFolder).map(([k, v]) => `${k} ${gb(v)}`).join(", ") || "empty"}.` : "Disk usage unavailable (non-local storage).",
    env.storageWarning ? `Warning: ${env.storageWarning}` : "",
    ``,
    `# Workflows right now`,
    ...(Object.entries(board) as [string, typeof board.working][]).map(([lane, items]) => `${lane} (${items.length}): ${items.slice(0, 8).map((i) => `“${i.title}” – ${i.headline}${i.diagnosis ? ` [${i.diagnosis.title}: ${i.diagnosis.explain}]` : ""} (${i.progress.done}/${i.progress.total} steps, $${(i.costCents / 100).toFixed(2)} of $${(i.budgetCents / 100).toFixed(2)})`).join("; ") || "none"}`),
    ``,
    `# Recent errors (newest first, last 24h)`,
    ...(errors.length ? errors.map((s) => `- ${s.updated_at} ${s.agent} “${s.label}” (${s.status}): ${s.error!.slice(0, 300)}`) : ["none"]),
    ``,
    `# Settings`,
    `Autopilot ${settings.autopilot ? "on" : "off"} (${settings.autopilot_series_per_day}/day, up to ${settings.autopilot_pipeline} in development, ${settings.autopilot_episodes_per_week} episodes/week per greenlit series). Episode budget $${(settings.default_episode_budget_cents / 100).toFixed(2)} (writing only; audio, cover and QC are uncapped), series budget $${(settings.default_series_budget_cents / 100).toFixed(2)}. Episode length cap ${settings.max_episode_minutes} min. Narrator: ${settings.single_narrator ? `one narrator, ${settings.narrator_voice}` : "multi-voice"}. Music ${settings.episode_music ? "on" : "off"}. Default model ${settings.default_model}; image endpoint ${settings.fal_image_endpoint}; TTS ${settings.tts_model}.`,
    `Providers: ${providerStatus().map((p) => `${p.name} ${p.connected ? "connected" : "NOT connected"}`).join(", ")}.`,
    `Spend (estimated): today $${spend(since).toFixed(2)}, this month $${spend(monthStart).toFixed(2)}.`,
  ].filter((l) => l !== "").join("\n");
}

const HOW = `You are the help desk inside Sleep Stories Studio, answering the studio's owner, who is not technical.
Answer from the live snapshot below – quote real numbers from it. Be short and plain: say what's happening, why, and exactly what to click (in the studio, or in Railway / ElevenLabs / Anthropic / fal) to fix it. No jargon; if you must use a technical term, explain it in a few words. If the snapshot doesn't show the answer, say so and suggest what to check.
Useful facts: the studio runs on Railway; all files are saved on the Railway volume mounted at the data directory, and the "Disk the app sees" line is the real size of that volume from the app's point of view (if it is smaller than what Railway's settings show, the resize hasn't reached the app yet – restart the Test2 service). A Railway account's overall storage allowance is not the same as the size of this one volume. Settings → Storage → Free up space deletes unused files; the Now page has Quick fix buttons. Episodes need the owner's approval before publishing.`;

/** Answer a plain-English question about the studio using its live state. */
export async function askStudio(question: string): Promise<{ answer: string; cost_cents: number }> {
  const snapshot = await studioSnapshot();
  const res = await callClaude({ agent: "quality_controller", meta: { runId: null, stepId: null, seriesId: null }, context: `${HOW}\n\n# LIVE SNAPSHOT\n${snapshot}`, prompt: question, maxTokens: 16000 });
  return { answer: res.text, cost_cents: res.cost_cents };
}
