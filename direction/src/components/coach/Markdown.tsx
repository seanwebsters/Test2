import { Fragment, type ReactNode } from "react";

/** Minimal, safe markdown: paragraphs, **bold**, *italic*, lists and quotes. No HTML. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    out.push(t.startsWith("**") ? <strong key={i++}>{t.slice(2, -2)}</strong> : <em key={i++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (/^\s*[-•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-•]\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*[-•]\s+/, ""));
      blocks.push(<ul key={k++} className="my-2 list-disc space-y-1 pl-5">{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push(<ol key={k++} className="my-2 list-decimal space-y-1 pl-5">{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) q.push(lines[i++]!.replace(/^>\s?/, ""));
      blocks.push(<blockquote key={k++} className="my-2 rounded-2xl border-l-4 border-teal bg-surface-2 px-3 py-2">{inline(q.join(" "))}</blockquote>);
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      blocks.push(<p key={k++} className="mt-2 font-display font-bold">{inline(line.replace(/^#{1,3}\s+/, ""))}</p>);
      i++;
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== "" && !/^\s*([-•]|\d+[.)]|>|#)/.test(lines[i]!)) para.push(lines[i++]!);
    blocks.push(<p key={k++} className="my-1.5">{para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p)}</Fragment>)}</p>);
  }
  return <>{blocks}</>;
}
