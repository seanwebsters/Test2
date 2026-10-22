import { SERIES, previewFor } from "@/lib/catalog";
import { DiscoverFeed, type FeedItem } from "./DiscoverFeed";

export const metadata = { title: "Discover" };

const FEATURED = [
  "the-fall-of-rome-1", "how-the-rich-got-rich-1", "why-we-fall-in-love-2", "universe-explained-1",
  "why-humans-do-that-1", "too-good-to-be-true-1", "how-trends-happen-1", "why-we-fall-in-love-1",
];

function shuffle<T>(arr: T[], seed: number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = Math.floor((seed / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Page() {
  const items: FeedItem[] = [];
  for (const s of SERIES) {
    for (const e of s.episodes) {
      const pv = e.hasAudio ? previewFor(e.id) : null;
      if (!pv) continue;
      items.push({ episodeId: e.id, slug: s.slug, n: e.n, title: e.title, hook: e.n === 1 ? s.hook : pv.lines[0]?.text ?? e.description, lines: pv.lines, duration: pv.duration, free: e.n <= s.freeEpisodes });
    }
  }
  const featured = FEATURED.map((id) => items.find((i) => i.episodeId === id)).filter(Boolean) as FeedItem[];
  const rest = shuffle(items.filter((i) => !FEATURED.includes(i.episodeId)), 7);
  return <DiscoverFeed items={[...featured, ...rest]} />;
}
