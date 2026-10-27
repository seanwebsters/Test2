/**
 * Conservative clean-up for model-written SVG. The studio only ever renders
 * these through <img> (which never runs scripts), but we strip anything
 * active or external anyway so exported bundles stay inert.
 */
export function sanitizeSvg(input: string): string | null {
  const m = input.match(/<svg[\s\S]*<\/svg>/i);
  if (!m) return null;
  let svg = m[0]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<(iframe|object|embed|image|use|a)\b[\s\S]*?(\/>|<\/\1>)/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "")
    .replace(/url\(\s*(['"]?)(?!#)[^)]*\)/gi, "none")
    .replace(/@import[^;]*;?/gi, "");
  if (!/xmlns=/.test(svg)) svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg.length > 12000 ? null : svg;
}
