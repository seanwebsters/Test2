import Link from "next/link";
import { CardThumb } from "@/components/cards/CardThumb";
import { container } from "@/components/ui/styles";
import { isReleased } from "@/lib/catalog";
import { faceFor } from "@/lib/view/face";
import { liveUniverseOr404 } from "@/lib/view/load";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Characters" };

const ROLE: Record<string, string> = { lead: "Lead", supporting: "Supporting", antagonist: "Antagonist", mystery: "Mystery" };

export default async function UniverseCharacters({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { state, user, at, idx } = await pageCtx();
  const u = liveUniverseOr404(state, slug, at, user.role === "admin");
  const inv = state.inventory[user.id] ?? {};
  return (
    <div className={`${container} space-y-6 py-10`}>
      {u.characters.map((c) => {
        const cards = u.cards.filter((k) => k.characterId === c.id && isReleased(idx, k.releaseOffsetDays, at));
        const faction = u.factions.find((f) => f.id === c.factionId);
        const hidden = c.role === "mystery" && !cards.some((k) => inv[k.id]);
        return (
          <article key={c.id} id={c.id} className="scroll-mt-36 grid gap-6 rounded-3xl border border-white/10 bg-ink-2 p-5 md:grid-cols-[200px_1fr] md:p-7">
            <div className="flex gap-3 md:block">
              {cards[0] ? <CardThumb face={faceFor(cards[0], u)} locked={!inv[cards[0].id]} className="w-[40vw] md:w-full" /> : <div className="aspect-[5/7] w-[40vw] rounded-2xl bg-white/5 md:w-full" />}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: faction?.color }}>{ROLE[c.role]} · {faction?.name}</p>
              <h2 className={`ff-${u.style.displayFont} mt-1 text-4xl`} style={{ color: u.style.palette.ink }}>{c.name}</h2>
              <p className="text-bone-3">{c.title}</p>
              {hidden ? (
                <p className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-sm text-bone-3">Classified. Discover this character's card to reveal their file.</p>
              ) : (
                <>
                  <p className="mt-4 max-w-3xl leading-relaxed text-bone-2">{c.bio}</p>
                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                    <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-bone-4">Personality</dt><dd className="mt-1 text-bone-2">{c.personality}</dd></div>
                    <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-bone-4">Wants</dt><dd className="mt-1 text-bone-2">{c.motivation}</dd></div>
                    <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-bone-4">Look</dt><dd className="mt-1 text-bone-2">{c.visual}</dd></div>
                    <div><dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-bone-4">Arc</dt><dd className="mt-1 text-bone-2">{c.arc}</dd></div>
                  </dl>
                  {c.relationships.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {c.relationships.map((r) => {
                        const other = u.characters.find((x) => x.id === r.to);
                        return other ? (
                          <li key={r.to}>
                            <Link href={`#${other.id}`} className="block rounded-xl border border-white/10 px-3 py-2 text-[13px] hover:border-white/25">
                              <span className="font-bold capitalize">{r.type}</span> · {other.name}
                              <span className="block text-[12px] text-bone-3">{r.note}</span>
                            </Link>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
