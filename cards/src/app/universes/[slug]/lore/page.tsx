import { Lock, ScrollText, Unlock } from "lucide-react";
import { container, eyebrow } from "@/components/ui/styles";
import { WorldMap } from "@/components/universe/WorldMap";
import { hashString } from "@/lib/content/build";
import { describeRequirement, extraUnlocked, ownedInUniverse } from "@/lib/services/story";
import { liveUniverseOr404 } from "@/lib/view/load";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Lore" };

const KIND: Record<string, string> = { diary: "Character diary", perspective: "Alternate perspective", "secret-lore": "Secret lore", "behind-the-scenes": "Behind the scenes", "side-story": "Side story", history: "World history" };

export default async function UniverseLore({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { state, user, at } = await pageCtx();
  const u = liveUniverseOr404(state, slug, at, user.role === "admin");
  const w = u.world;
  const owned = ownedInUniverse(state, user.id, u.id);
  const secretsUnlocked = owned >= 15;
  return (
    <div className={`${container} grid gap-12 py-10 lg:grid-cols-[1fr_380px]`}>
      <div className="space-y-10">
        <section>
          <p className={eyebrow}>History</p>
          <p className="mt-3 text-lg leading-relaxed">{w.history}</p>
        </section>
        <section>
          <p className={eyebrow}>Geography</p>
          <div className="mt-4"><WorldMap locations={w.locations} palette={u.style.palette} seed={hashString(u.id)} /></div>
          <p className="mt-4 leading-relaxed text-bone-2">{w.geography}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {w.locations.map((l) => (
              <li key={l.id} className="rounded-2xl border border-white/10 bg-ink-2 p-4"><p className="font-bold">{l.name}</p><p className="mt-1 text-sm text-bone-3">{l.description}</p></li>
            ))}
          </ul>
        </section>
        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <p className={eyebrow}>The rules of the world</p>
            <ol className="mt-3 space-y-2">
              {w.rules.map((r, i) => (
                <li key={i} className="flex gap-3 text-bone-2"><span className="font-brand text-sm text-bone-4">{String(i + 1).padStart(2, "0")}</span>{r}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className={eyebrow}>Conflicts</p>
            <ul className="mt-3 space-y-2">
              {w.conflicts.map((c, i) => <li key={i} className="text-bone-2">— {c}</li>)}
            </ul>
          </div>
          <div>
            <p className={eyebrow}>Culture</p>
            <p className="mt-3 text-bone-2">{w.culture}</p>
          </div>
          <div>
            <p className={eyebrow}>Mythology</p>
            <p className="mt-3 text-bone-2">{w.mythology}</p>
          </div>
        </section>
        <section>
          <p className={eyebrow}>Secrets</p>
          <div className="mt-3 space-y-2">
            {w.secrets.map((s, i) => (
              <p key={i} className={`rounded-xl border p-4 ${secretsUnlocked ? "border-white/10 text-bone" : "select-none border-dashed border-white/15 text-transparent [text-shadow:0_0_10px_rgba(255,255,255,.5)]"}`}>{s}</p>
            ))}
            {!secretsUnlocked && <p className="text-sm text-bone-3">Collect 15 {u.title} cards to declassify ({owned}/15).</p>}
          </div>
        </section>
        <section>
          <p className={eyebrow}>Art direction</p>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="font-bold">Lighting</dt><dd className="text-bone-2">{u.style.lighting}</dd></div>
            <div><dt className="font-bold">Character design</dt><dd className="text-bone-2">{u.style.characterRules}</dd></div>
            <div><dt className="font-bold">Card frame</dt><dd className="text-bone-2">{u.style.frameStyle}</dd></div>
            <div><dt className="font-bold">Logo</dt><dd className="text-bone-2">{u.style.logoDirection}</dd></div>
          </dl>
          <div className="mt-4 flex gap-2">{[u.style.palette.bg, u.style.palette.surface, u.style.palette.accent, u.style.palette.accent2, ...u.style.palette.art].map((c, i) => <span key={i} className="h-8 w-8 rounded-lg border border-white/10" style={{ background: c }} title={c} />)}</div>
        </section>
      </div>
      <aside>
        <div className="sticky top-36 space-y-3">
          <p className={eyebrow}>Unlockable extras</p>
          {u.extras.map((x) => {
            const open = extraUnlocked(state, user.id, x, u);
            return (
              <details key={x.id} className="group rounded-2xl border border-white/10 bg-ink-2 p-4" open={false}>
                <summary className="flex cursor-pointer list-none items-start gap-3">
                  {open ? <Unlock size={16} className="mt-1 text-uncommon" /> : <Lock size={16} className="mt-1 text-bone-4" />}
                  <span>
                    <span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-bone-3">{KIND[x.kind]}</span>
                    <span className="font-bold">{x.title}</span>
                  </span>
                </summary>
                {open ? (
                  <div className="mt-3 space-y-2 text-sm leading-relaxed text-bone-2"><ScrollText size={14} className="text-bone-4" />{x.body.map((p, i) => <p key={i}>{p}</p>)}</div>
                ) : (
                  <p className="mt-3 text-sm text-bone-3">{describeRequirement(x, u)} to unlock.</p>
                )}
              </details>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
