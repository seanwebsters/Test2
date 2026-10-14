import { wordCount } from "@/lib/util";

/**
 * Splits a script into narration sections at paragraph boundaries, so any
 * section can be regenerated on its own. Sections aim for ~120–220 words.
 */
export function splitScript(script: string, targetWords = 170): string[] {
  const paras = script
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const out: string[] = [];
  let cur: string[] = [];
  let words = 0;
  for (const p of paras) {
    const w = wordCount(p);
    if (cur.length && words + w > targetWords * 1.3) {
      out.push(cur.join("\n\n"));
      cur = [];
      words = 0;
    }
    cur.push(p);
    words += w;
    if (words >= targetWords) {
      out.push(cur.join("\n\n"));
      cur = [];
      words = 0;
    }
  }
  if (cur.length) {
    // Fold a very short tail into the previous section.
    if (out.length && words < targetWords / 3) out[out.length - 1] += `\n\n${cur.join("\n\n")}`;
    else out.push(cur.join("\n\n"));
  }
  return out;
}

/** Script text sent to TTS: stage directions and markup removed. */
export function narrationText(section: string): string {
  return section
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[*_#>]+/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}
