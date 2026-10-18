import Link from "next/link";
import { notFound } from "next/navigation";
import { Art } from "@/components/art/Art";
import { RarityGem } from "@/components/cards/RarityGem";
import { AdminAction } from "@/components/studio/AdminAction";
import { field, JsonForm, lbl, SelectPatch, Upload } from "@/components/studio/Forms";
import { btn } from "@/components/ui/styles";
import { catalog, isReleased, releaseTime } from "@/lib/catalog";
import { now } from "@/lib/clock";
import { hashString } from "@/lib/content/build";
import { CARD_KINDS, GENRES, RARITIES } from "@/lib/content/types";
import { getStore } from "@/lib/db";

export const metadata = { title: "Edit universe" };

const Section = ({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) => (
  <section id={id} className="scroll-mt-24 rounded-2xl border border-white/10 bg-ink-2 p-5">
    <h2 className="text-lg font-bold">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

export default async function EditUniverse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = getStore().read();
  const at = now();
  const idx = catalog(state);
  const u = idx.byId.get(id);
  if (!u) notFound();
  const editable = u.source === "studio";
  const job = state.jobs.find((j) => j.universeId === u.id);
  const hero = state.overrides[u.id]?.heroImageUrl;

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-white/10" style={{ background: u.style.palette.bg }}>
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        ) : (
          <Art style={u.style.artStyle} palette={u.style.palette} seed={hashString(u.id)} aspect="hero" sceneOnly className="absolute inset-0 h-full w-full opacity-60" />
        )}
        <div className="relative bg-gradient-to-r from-black/85 to-black/20 p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bone-3">{u.source === "seed" ? "Launch slate · code-managed" : "Studio universe"} · {u.status}</p>
          <h1 className={`ff-${u.style.displayFont} mt-1 text-5xl`} style={{ color: u.style.palette.ink }}>{u.title}</h1>
          <p className="mt-1 text-bone-2">{u.tagline}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {u.status === "published" ? (
              <AdminAction url="/api/studio/universe/status" body={{ universeId: u.id, status: "unpublished" }} label="Unpublish" confirm="Unpublish this universe?" />
            ) : (
              <AdminAction url="/api/studio/universe/status" body={{ universeId: u.id, status: "published" }} label="Approve & publish" kind="primary" />
            )}
            <AdminAction url="/api/studio/universe/featured" body={{ universeId: u.id, featured: !u.editorial.featured }} label={u.editorial.featured ? "Remove from hero" : "Feature on home"} />
            <Upload universeId={u.id} label="Upload hero artwork" />
            <Link href={`/universes/${u.slug}`} className={btn("ghost", "sm")}>Preview</Link>
            {job && <Link href={`/studio/generate?job=${job.id}`} className={btn("ghost", "sm")}>Open generation job</Link>}
          </div>
        </div>
      </div>

      {!editable && <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[13px] text-bone-3">Launch-slate universes are defined in code (src/lib/content/universes). From Studio you can publish/unpublish, feature, reschedule episodes, change card rarities and names, and upload artwork. Studio-created universes are fully editable here.</p>}

      {editable && (
        <Section title="Details & lore">
          <JsonForm url="/api/studio/universe/details" submit="Save details" extra={{ universeId: u.id }} className="grid gap-3 md:grid-cols-2">
            <label className={lbl}>Title<input name="title" defaultValue={u.title} className={field} required /></label>
            <label className={lbl}>Tagline<input name="tagline" defaultValue={u.tagline} className={field} /></label>
            <label className={`${lbl} md:col-span-2`}>Premise<textarea name="premise" defaultValue={u.premise} className={`${field} min-h-20`} /></label>
            <label className={`${lbl} md:col-span-2`}>Synopsis<textarea name="synopsis" defaultValue={u.synopsis} className={`${field} min-h-20`} /></label>
            <label className={lbl}>History<textarea name="history" defaultValue={u.world.history} className={`${field} min-h-24`} /></label>
            <label className={lbl}>Geography<textarea name="geography" defaultValue={u.world.geography} className={`${field} min-h-24`} /></label>
            <label className={`${lbl} md:col-span-2`}>Mythology<textarea name="mythology" defaultValue={u.world.mythology} className={`${field} min-h-16`} /></label>
            <fieldset className="md:col-span-2">
              <legend className={lbl}>Genres</legend>
              <div className="mt-2 flex flex-wrap gap-2">{GENRES.map((g) => <label key={g.id} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[12px]"><input type="checkbox" name="genres[]" value={g.id} defaultChecked={u.genres.includes(g.id)} /> {g.label}</label>)}</div>
            </fieldset>
          </JsonForm>
        </Section>
      )}

      <Section title={`Characters (${u.characters.length})`} id="characters">
        <ul className="grid gap-2 md:grid-cols-2">
          {u.characters.map((c) => (
            <li key={c.id} className="rounded-xl bg-white/[0.03] p-3 text-sm"><b>{c.name}</b> <span className="text-bone-3">· {c.role} · {u.factions.find((f) => f.id === c.factionId)?.name}</span><p className="mt-1 line-clamp-2 text-[12.5px] text-bone-3">{c.bio}</p></li>
          ))}
        </ul>
        {editable && (
          <JsonForm url="/api/studio/universe/character" submit="Add character" extra={{ universeId: u.id }} className="mt-5 grid gap-3 border-t border-white/5 pt-5 md:grid-cols-3">
            <label className={lbl}>Name<input name="name" className={field} required /></label>
            <label className={lbl}>Title<input name="title" className={field} /></label>
            <label className={lbl}>Role<select name="role" className={field}>{["lead", "supporting", "antagonist", "mystery"].map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className={lbl}>Faction<select name="factionId" className={field}>{u.factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
            <label className={`${lbl} md:col-span-2`}>Look<input name="visual" className={field} /></label>
            <label className={`${lbl} md:col-span-3`}>Bio<textarea name="bio" className={`${field} min-h-16`} /></label>
          </JsonForm>
        )}
      </Section>

      <Section title={`Card set (${u.cards.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-bone-4"><tr><th className="py-1">#</th><th>Name</th><th>Kind</th><th>Rarity</th><th>Released</th><th className="text-right">Art</th></tr></thead>
            <tbody>
              {u.cards.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-1.5 text-bone-4">{c.season}-{String(c.number).padStart(3, "0")}</td>
                  <td><Link href={`/cards/${c.id}`} className="hover:underline">{c.name}</Link></td>
                  <td className="text-bone-3">{c.kind}</td>
                  <td><span className="flex items-center gap-1.5"><RarityGem rarity={c.rarity} /><SelectPatch url="/api/studio/card/patch" body={{ cardId: c.id }} name="rarity" value={c.rarity} options={[...RARITIES]} /></span></td>
                  <td className="text-[12px] text-bone-3">{isReleased(idx, c.releaseOffsetDays, at) ? "Live" : new Date(releaseTime(idx, c.releaseOffsetDays)).toISOString().slice(0, 10)}</td>
                  <td className="text-right"><Upload universeId={u.id} cardId={c.id} label={c.imageUrl ? "Replace" : "Upload"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editable && (
          <JsonForm url="/api/studio/universe/card" submit="Add card" extra={{ universeId: u.id }} className="mt-5 grid gap-3 border-t border-white/5 pt-5 md:grid-cols-3">
            <label className={lbl}>Name<input name="name" className={field} required /></label>
            <label className={lbl}>Kind<select name="kind" className={field}>{CARD_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label className={lbl}>Rarity<select name="rarity" className={field}>{RARITIES.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label className={lbl}>Faction<select name="factionId" className={field}><option value="">—</option>{u.factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
            <label className={lbl}>Character<select name="characterId" className={field}><option value="">—</option>{u.characters.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
            <label className={lbl}>Introduced in<select name="episodeId" className={field}><option value="">Launch</option>{u.episodes.map((e) => <option key={e.id} value={e.id}>E{e.number} {e.title}</option>)}</select></label>
            <label className={`${lbl} md:col-span-3`}>Description<input name="description" className={field} required maxLength={200} /></label>
            <label className={`${lbl} md:col-span-3`}>Lore<textarea name="lore" className={`${field} min-h-16`} /></label>
          </JsonForm>
        )}
      </Section>

      <Section title={`Seasons & episodes (${u.episodes.length})`}>
        <ul className="space-y-2 text-sm">
          {u.episodes.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3">
              <span><b>S{e.season} E{e.number}</b> {e.title} <span className="text-bone-4">· {e.access.type} · {e.cardIds.length} cards</span></span>
              <span className="text-[12px] text-bone-3">{isReleased(idx, e.releaseOffsetDays, at) ? "Released" : `Scheduled ${new Date(releaseTime(idx, e.releaseOffsetDays)).toUTCString().slice(0, 22)}`}</span>
            </li>
          ))}
        </ul>
        <Link href="/studio/releases" className={`${btn("glass", "sm")} mt-3`}>Manage release schedule</Link>
        {editable && (
          <JsonForm url="/api/studio/universe/episode" submit="Add episode" extra={{ universeId: u.id }} className="mt-5 grid gap-3 border-t border-white/5 pt-5 md:grid-cols-3" transform={(v) => ({ ...v, releaseAt: v.releaseAt ? new Date(String(v.releaseAt)).toISOString() : undefined })}>
            <label className={lbl}>Title<input name="title" className={field} required /></label>
            <label className={lbl}>Access<select name="access" className={field}><option value="free">Free</option><option value="collect">Collect 5 cards</option><option value="shards">40 Shards</option></select></label>
            <label className={lbl}>Release (local time)<input type="datetime-local" name="releaseAt" className={field} /></label>
            <label className={`${lbl} md:col-span-3`}>Synopsis<input name="synopsis" className={field} /></label>
            <label className={`${lbl} md:col-span-3`}>Script (blank line between paragraphs)<textarea name="body" className={`${field} min-h-40`} required /></label>
          </JsonForm>
        )}
      </Section>
    </div>
  );
}
