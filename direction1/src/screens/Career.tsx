import { useEffect, useState } from 'react';
import { CareerAvatar } from '../components/CareerAvatar';
import { Glyph } from '../components/Glyph';
import { Icon } from '../components/Icon';
import { Button, Header, Pill } from '../components/ui';
import { CAREER_BY_ID, ROUTE_LABEL, SALARY_NOTE } from '../data/careers';
import { EPISODES } from '../data/episodes';
import { WORLD_BY_ID } from '../data/worlds';
import { matchPct, reasonFor } from '../lib/recommend';
import { useRecState } from '../lib/useRec';
import { SIM_BY_ID } from '../sims';
import { useGame } from '../store/game';
import { useNav } from '../store/nav';

const ROUTE_GLYPH = { university: 'flag', apprenticeship: 'wrench', 'self-taught': 'laptop', entrepreneur: 'rocket', college: 'book', 'on-the-job': 'suitcase' } as const;

export function CareerScreen({ id }: { id: string }) {
  const c = CAREER_BY_ID[id];
  const w = WORLD_BY_ID[c.world];
  const rs = useRecState();
  const saved = useGame((s) => s.saved.includes(id));
  const toggleSave = useGame((s) => s.toggleSave);
  const view = useGame((s) => s.view);
  const push = useNav((s) => s.push);
  const [info, setInfo] = useState(false);
  useEffect(() => { view(id); }, [id, view]);
  const sim = c.sim ? SIM_BY_ID[c.sim] : undefined;
  const ep = EPISODES.find((e) => e.careers.includes(id));
  const fmt = (r: [number, number]) => (r[0] === 0 ? `Varies – £${r[1]}k` : `£${r[0]}k–£${r[1]}k`);

  return (
    <div className="min-h-screen bg-white">
      <Header tint={w.palette.soft} title={<span className="text-base">{w.name}</span>}
        right={<button onClick={() => toggleSave(id)} className={`flex h-10 w-10 items-center justify-center rounded-full ${saved ? 'text-sun-500' : 'text-ink-500'}`} aria-label={saved ? 'Unsave career' : 'Save career'}><Icon name={saved ? 'bookmarkFill' : 'bookmark'} /></button>} />
      <div className="px-5 pb-6" style={{ background: w.palette.soft }}>
        <div className="flex items-center gap-4">
          <CareerAvatar career={c} size={96} />
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">{c.lesserKnown && <Pill color="#FFF6D6" text="#8A5A00">Hidden gem</Pill>}<Pill color="#fff" text={w.palette.deep}>{matchPct(c, rs)}% match</Pill></div>
            <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight">{c.title}</h1>
            <p className="font-semibold text-ink-500">{c.oneLiner}</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-extrabold" style={{ color: w.palette.deep }}><Icon name="sparkle" size={14} />{reasonFor(c, rs)} · a suggestion, not a verdict</p>
        <div className="mt-4 flex gap-2">
          {sim && <Button tone="lime" className="flex-1" onClick={() => push({ name: 'sim', id: sim.id })}><Icon name="playFill" size={18} />Try it</Button>}
          <Button tone="white" className="flex-1" onClick={() => push({ name: 'lesson', careerId: c.id })}><Icon name="bolt" size={18} />Quick lesson</Button>
        </div>
      </div>

      <div className="space-y-6 px-5 py-6">
        <Block title="What the job actually involves"><p className="font-semibold leading-relaxed text-ink-700">{c.involves}</p></Block>

        <Block title="A typical day">
          <ol className="relative ml-2 border-l-4 pl-5" style={{ borderColor: w.palette.soft }}>
            {c.day.map(([t, d]) => (
              <li key={t} className="relative mb-4 last:mb-0">
                <span className="absolute -left-[31px] top-0.5 h-5 w-5 rounded-full border-4 border-white" style={{ background: w.palette.accent }} />
                <div className="text-xs font-extrabold text-ink-400">{t}</div><div className="font-bold text-ink-900">{d}</div>
              </li>
            ))}
          </ol>
        </Block>

        <Block title={<span className="flex items-center gap-2">Indicative UK salary <Pill color="#FFE6E1" text="#B02A1A">Illustrative</Pill></span>}>
          <div className="grid grid-cols-3 gap-2">
            {[['Starting', c.salary.entry], ['Experienced', c.salary.experienced], ['Senior', c.salary.senior]].map(([l, r]) => r && (
              <div key={l as string} className="rounded-2xl bg-cloud p-3 text-center"><div className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{l as string}</div><div className="mt-1 font-display text-[15px] font-semibold">{fmt(r as [number, number])}</div></div>
            ))}
          </div>
          <button onClick={() => setInfo(!info)} className="mt-2 flex items-center gap-1 text-xs font-extrabold text-grape-500"><Icon name="info" size={14} />{c.salaryVerified ? `Verified: ${c.salaryVerified.source}` : 'Prototype data — not verified'}</button>
          {info && <p className="mt-1 rounded-xl bg-coral-100 p-3 text-xs font-semibold text-ink-700">{SALARY_NOTE}</p>}
        </Block>

        <Block title="Qualifications"><p className="font-semibold text-ink-700">{c.qualifications}</p></Block>

        <Block title="Ways in">
          <div className="space-y-2.5">
            {c.routes.map((r) => (
              <div key={r.title} className="flex gap-3 rounded-2xl border-2 border-grape-50 p-3">
                <Glyph name={ROUTE_GLYPH[r.type]} size={40} tile />
                <div className="min-w-0"><div className="text-[11px] font-extrabold uppercase tracking-wider text-grape-500">{ROUTE_LABEL[r.type]} · {r.time}</div><div className="font-display font-semibold">{r.title}</div><div className="text-sm font-semibold text-ink-500">{r.detail}</div></div>
              </div>
            ))}
          </div>
          <Button tone="white" full className="mt-3" onClick={() => push({ name: 'roadmap', careerId: c.id })}><Icon name="route" size={18} />See my roadmap to this</Button>
        </Block>

        <Block title="Apprenticeship opportunities"><div className="flex gap-3 rounded-2xl bg-lime-100 p-3"><Glyph name="wrench" size={36} /><p className="text-sm font-bold text-ink-700">{c.apprenticeships}<span className="mt-1 block text-xs font-semibold text-ink-500">Search live vacancies on the government’s Find an Apprenticeship service.</span></p></div></Block>

        <Block title="Important skills"><div className="flex flex-wrap gap-2">{c.skills.map((s) => <span key={s} className="rounded-full px-3 py-1.5 text-sm font-extrabold" style={{ background: w.palette.soft, color: w.palette.deep }}>{s}</span>)}</div></Block>

        <Block title="Lifestyle">
          <div className="grid grid-cols-2 gap-2">
            {[['clock', 'Hours', c.lifestyle.hours], ['map', 'Where', c.lifestyle.setting], ['refresh', 'Flexibility', c.lifestyle.flexibility], ['explore', 'Travel', c.lifestyle.travel]].map(([ic, l, v]) => (
              <div key={l} className="rounded-2xl bg-cloud p-3"><div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-400"><Icon name={ic as 'clock'} size={14} />{l}</div><div className="mt-0.5 text-sm font-bold">{v}</div></div>
            ))}
          </div>
        </Block>

        {sim && (
          <button onClick={() => push({ name: 'sim', id: sim.id })} className="flex w-full items-center gap-3 rounded-3xl p-4 text-left text-white shadow-[0_5px_0_rgba(0,0,0,.15)]" style={{ background: w.palette.accent }}>
            <Glyph name={sim.glyph} size={52} tile="#ffffff" />
            <div className="flex-1"><div className="text-xs font-extrabold uppercase tracking-wider opacity-90">Interactive simulation</div><div className="font-display text-lg font-semibold">{sim.title}</div><div className="text-sm font-semibold opacity-90">Be a {sim.role} for {sim.minutes} minutes</div></div>
            <Icon name="playFill" />
          </button>
        )}
        {ep && (
          <button onClick={() => push({ name: 'episode', id: ep.id })} className="flex w-full items-center gap-3 rounded-3xl bg-ink-900 p-4 text-left text-white">
            <Glyph name="mic" size={44} tile="#ffffff" /><div className="flex-1"><div className="text-xs font-extrabold uppercase tracking-wider text-lime-300">Day in the Life</div><div className="font-display font-semibold">{ep.title}</div></div><Icon name="playFill" />
          </button>
        )}

        {c.related.length > 0 && (
          <Block title="Related careers">
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
              {c.related.map((rid) => { const r = CAREER_BY_ID[rid]; return (
                <button key={rid} onClick={() => push({ name: 'career', id: rid })} className="w-[140px] shrink-0 rounded-3xl border-2 border-grape-50 bg-white p-3 text-left"><CareerAvatar career={r} size={48} /><div className="mt-2 font-display text-sm font-semibold leading-tight">{r.title}</div></button>
              ); })}
            </div>
          </Block>
        )}

        <Button tone={saved ? 'white' : 'sun'} full size="lg" onClick={() => toggleSave(id)}><Icon name={saved ? 'bookmarkFill' : 'bookmark'} />{saved ? 'Saved to My Future' : 'Save career'}</Button>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return <section><h2 className="mb-2.5 font-display text-lg font-semibold text-ink-900">{title}</h2>{children}</section>;
}
