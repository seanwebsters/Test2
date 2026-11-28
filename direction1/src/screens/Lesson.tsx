import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ActivityResult, type FeedbackItem } from '../components/ActivityResult';
import { CareerAvatar } from '../components/CareerAvatar';
import { Icon } from '../components/Icon';
import { Button, Pill, Progress } from '../components/ui';
import { CAREER_BY_ID } from '../data/careers';
import { WORLD_BY_ID } from '../data/worlds';
import { buildLesson } from '../lib/lessons';
import { useGame, type Reward } from '../store/game';
import { useNav } from '../store/nav';

export function LessonRunner({ careerId }: { careerId: string }) {
  const c = CAREER_BY_ID[careerId];
  const w = WORLD_BY_ID[c.world];
  const qs = useMemo(() => buildLesson(c), [c]);
  const record = useGame((s) => s.recordActivity);
  const back = useNav((s) => s.back);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [done, setDone] = useState<null | { reward: Reward; activityId: string }>(null);
  const q = qs[i];

  if (done) return <ActivityResult heading="Lesson complete!" world={c.world} careerId={c.id} reward={done.reward} activityId={done.activityId} skills={['curiosity']} feedback={items} />;

  const right = sel === q.answer;
  const next = () => {
    const it = [...items, { title: q.prompt, text: q.explain, good: right }];
    setItems(it);
    if (i + 1 < qs.length) { setI(i + 1); setSel(null); setChecked(false); return; }
    const correct = it.filter((x) => x.good).length;
    setDone(record({ kind: 'lesson', ref: c.id, world: c.world, careerId: c.id, xp: 20 + correct * 5, score: correct / qs.length, skills: ['curiosity'] }));
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={back} className="flex h-10 w-10 items-center justify-center rounded-full text-ink-400 hover:bg-grape-50" aria-label="Quit lesson"><Icon name="close" /></button>
        <Progress value={(i + (checked ? 1 : 0)) / qs.length} color={w.palette.accent} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} className="flex-1 px-5" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          <div className="flex items-center gap-3">
            <CareerAvatar career={c} size={52} />
            <div><Pill color={w.palette.soft} text={w.palette.deep}>{q.kind}</Pill><div className="mt-1 text-sm font-extrabold text-ink-500">{c.title}</div></div>
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold leading-snug">{q.prompt}</h1>
          <div className={`mt-5 grid gap-3 ${q.options.length === 2 ? 'grid-cols-2' : ''}`}>
            {q.options.map((o, k) => {
              const state = checked ? (k === q.answer ? 'right' : k === sel ? 'wrong' : 'idle') : sel === k ? 'sel' : 'idle';
              return (
                <motion.button key={o} whileTap={{ scale: 0.97 }} disabled={checked} onClick={() => setSel(k)}
                  animate={state === 'wrong' ? { x: [0, -8, 8, -4, 0] } : {}}
                  className={`rounded-2xl border-2 p-4 text-left font-display text-[17px] font-medium ${state === 'right' ? 'border-lime-500 bg-lime-100' : state === 'wrong' ? 'border-coral-400 bg-coral-100' : state === 'sel' ? 'border-grape-500 bg-grape-50 shadow-[0_4px_0_#7C3AED]' : 'border-grape-100 bg-white shadow-[0_4px_0_#EDE4FB]'}`}>
                  {o}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className={`sticky bottom-0 mt-6 px-5 pb-8 pt-4 ${checked ? (right ? 'bg-lime-100' : 'bg-coral-100') : 'bg-white'}`}>
        {checked && (
          <div className="mb-3">
            <div className={`font-display text-xl font-semibold ${right ? 'text-lime-700' : 'text-coral-600'}`}>{right ? 'Nailed it!' : 'Not quite — now you know!'}</div>
            <p className="mt-1 text-sm font-semibold text-ink-700">{q.explain}</p>
          </div>
        )}
        {checked ? <Button tone={right ? 'lime' : 'coral'} full size="lg" onClick={next}>Continue</Button>
          : <Button tone="lime" full size="lg" disabled={sel === null} onClick={() => setChecked(true)}>Check</Button>}
      </div>
    </div>
  );
}
