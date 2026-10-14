import "server-only";
import { getDb } from "@/lib/db";
import type { ReviewCheck } from "@/lib/types";
import { loadStoryContext } from "@/lib/story/context";
import { checkFacts, checkWorldRules, sleepSuitability } from "@/lib/story/checks";
import { currentScriptText } from "@/lib/storymaker/scripts";

const UNSAFE = /\b(sex\w*|nude|naked|gore|suicide|self[- ]harm|drugs?|racist|slur)\b/gi;
const IP_RISK = /\b(hogwarts|harry potter|middle[- ]earth|narnia|pokemon|pok[eé]mon|disney|marvel|star wars|jedi|frodo|gandalf|elsa)\b/gi;

/** Automated pre-review checks shown to editors. They inform, they never approve. */
export async function computeReviewChecks(episodeId: string): Promise<ReviewCheck[]> {
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  if (!ep) return [];
  const series = await db.get("series", ep.series_id);
  const current = await currentScriptText(ep.id);
  const asset = ep.audio_asset_id ? await db.get("audio_assets", ep.audio_asset_id) : null;
  const rights = await db.findOne("rights_declarations", { series_id: ep.series_id });
  const checks: ReviewCheck[] = [];
  const text = current?.version.content ?? "";

  const unsafe = [...new Set((text.match(UNSAFE) ?? []).map((s) => s.toLowerCase()))];
  const ip = [...new Set((text.match(IP_RISK) ?? []).map((s) => s.toLowerCase()))];
  checks.push(
    !text
      ? { name: "content_safety", status: "fail", detail: "No script attached." }
      : unsafe.length
        ? { name: "content_safety", status: "fail", detail: `Flagged terms: ${unsafe.join(", ")}.` }
        : { name: "content_safety", status: "pass", detail: "No unsafe terms detected by automated screening." },
  );
  const sleep = text ? sleepSuitability(text) : null;
  checks.push(
    sleep
      ? { name: "sleep_suitability", status: sleep.score >= 80 ? "pass" : sleep.score >= 60 ? "warn" : "fail", detail: `Score ${sleep.score}/100. ${sleep.issues.filter((i) => i.severity !== "pass").map((i) => i.message).join(" ") || "Restful throughout."}` }
      : { name: "sleep_suitability", status: "not_run", detail: "No script." },
  );
  if (text) {
    const ctx = await loadStoryContext(ep.series_id);
    const conflicts = [...checkWorldRules(text, ctx.bible.rules), ...checkFacts(text, ctx.bible.established_facts)];
    checks.push({ name: "continuity", status: conflicts.length ? "warn" : "pass", detail: conflicts.length ? conflicts.map((c) => `${c.message} – “${c.evidence.slice(0, 120)}”`).join(" ") : "No contradictions with the Story Bible found." });
  } else checks.push({ name: "continuity", status: "not_run", detail: "No script." });
  checks.push(
    ip.length
      ? { name: "rights", status: "fail", detail: `Possible third-party IP: ${ip.join(", ")}.` }
      : !rights
        ? { name: "rights", status: series?.is_official ? "pass" : "fail", detail: series?.is_official ? "Calm Original – rights held by Calm." : "No ownership & rights declaration on file." }
        : { name: "rights", status: rights.original_work && rights.voice_consent ? "pass" : "warn", detail: `Declared ${rights.original_work ? "original work" : "NOT fully original"}; third-party material: ${rights.third_party_material || "none"}; voice consent ${rights.voice_consent ? "confirmed" : "missing"}.` },
  );
  checks.push(
    !asset
      ? { name: "audio_quality", status: "fail", detail: "No finished audio mix attached." }
      : asset.kind === "sample"
        ? { name: "audio_quality", status: "warn", detail: "Uses the shared ambience sample, not a produced mix." }
        : asset.qa
          ? { name: "audio_quality", status: asset.qa.passed ? (asset.qa.issues.some((i) => i.severity === "warn") ? "warn" : "pass") : "fail", detail: asset.qa.issues.filter((i) => i.severity !== "pass").map((i) => i.message).join(" ") || `Peak ${asset.qa.peak_dbfs} dBFS, ~${asset.qa.integrated_loudness_approx_lufs} LUFS.` }
          : { name: "audio_quality", status: "not_run", detail: "Audio QA has not run." },
  );
  checks.push(
    ep.title && ep.summary.length > 20
      ? { name: "metadata", status: "pass", detail: "Title and description present." }
      : { name: "metadata", status: "warn", detail: "Add a fuller episode description." },
  );
  checks.push(
    series?.is_official || series?.ai_disclosure
      ? { name: "ai_disclosure", status: "pass", detail: series?.ai_disclosure ?? "Calm Original." }
      : { name: "ai_disclosure", status: "warn", detail: "No AI-assistance disclosure on the series." },
  );
  if (asset?.simulated && asset.kind !== "sample") {
    checks.push({ name: "audio_quality", status: "warn", detail: "Narration is simulated placeholder audio – connect a voice provider before release." });
  }
  return checks;
}
