/** Prints SQL that loads the seeded catalog into Supabase:  npm run db:seed-sql > supabase/seed.sql */
import { CATEGORIES, TOPICS } from "../src/content/categories";
import { SERIES_SEED } from "../src/content/series-data";
import { EDITORIAL_COLLECTIONS } from "../src/content/collections";
import manifest from "../src/content/audio-manifest.json";

const q = (v: unknown) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : typeof v === "boolean" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a: string[]) => `array[${a.map(q).join(",")}]::text[]`;
const json = (o: unknown) => `${q(JSON.stringify(o))}::jsonb`;
const out: string[] = ["begin;"];

for (const c of CATEGORIES) out.push(`insert into categories values (${[c.id, c.label, c.blurb, c.color, c.color2, c.deep, c.glyph].map(q).join(",")}) on conflict (id) do update set label = excluded.label;`);
for (const t of TOPICS) out.push(`insert into topics values (${q(t.id)},${q(t.label)},${q(t.category)},null) on conflict (id) do nothing;`);
for (const t of TOPICS) if (t.parent) out.push(`update topics set parent_id = ${q(t.parent)} where id = ${q(t.id)};`);
for (const t of TOPICS) {
  if (t.parent) out.push(`insert into topic_relationships values (${q(t.parent)},${q(t.id)},'parent') on conflict do nothing;`);
  for (const r of t.related ?? []) out.push(`insert into topic_relationships values (${q(t.id)},${q(r)},'related') on conflict do nothing;`);
}
const m = manifest as Record<string, { duration: number }>;
for (const s of SERIES_SEED) {
  out.push(`insert into series values (${[s.slug, s.title, s.tagline, s.description, s.hook, s.category].map(q).join(",")},${json(s.creator)},${s.rating},${s.ratingCount},${s.freeEpisodes},${json(s.art)},${q(s.trending ?? null)},${q(s.format)},${q(s.releaseNote ?? null)},${q(s.cardFact)}) on conflict (slug) do nothing;`);
  s.episodes.forEach(([title, desc, minutes, topics], i) => {
    const id = `${s.slug}-${i + 1}`;
    const released = i < s.released;
    out.push(`insert into episodes values (${q(id)},${q(s.slug)},${i + 1},${q(title)},${q(desc)},${minutes},${q(m[id]?.duration ?? null)},${q(released ? "released" : "upcoming")},${Boolean(m[id]) && released},${q(m[id] ? `content-audio/${id}.mp3` : null)},${arr(topics ?? s.topics.slice(0, 1))}) on conflict (id) do nothing;`);
  });
}
for (const c of EDITORIAL_COLLECTIONS) out.push(`insert into collections values (${[c.id, c.ownerId, c.ownerHandle, c.ownerName, c.title, c.description].map(q).join(",")},${arr(c.seriesSlugs)},true,true,0,${arr(c.palette)},now(),now()) on conflict (id) do nothing;`);
out.push("commit;");
console.log(out.join("\n"));
