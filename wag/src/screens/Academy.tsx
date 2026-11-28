import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Dog, type Pose } from '../art/Dog';
import { Icon, Star } from '../art/Icons';
import { UNITS, type Lesson, type Unit } from '../game/academy';
import { useGame } from '../game/store';
import { fill } from '../game/util';

const TRICK_POSE: Record<string, Pose> = { perk: 'perk', boop: 'boop', wave: 'wave', spin: 'spin', bow: 'bow', sniff: 'sniff', roll: 'roll' };

export function Academy({ onClose, onPlus }: { onClose: () => void; onPlus: () => void }) {
  const { s } = useGame();
  const dog = s.profile!.dog;
  const [lesson, setLesson] = useState<{ l: Lesson; u: Unit } | null>(null);

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 34 }} style={{ position: 'absolute', inset: 0, zIndex: 55, background: '#f7f1e6', overflowY: 'auto' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 3, padding: 'calc(var(--safe-top) + 12px) 16px 10px', background: '#b7c4f2', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="icon-btn" onClick={onClose} aria-label="Back">
          <Icon name="back" />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 24 }}>Paw Academy</h2>
          <p className="tiny">Kind, science-based, positive reinforcement only.</p>
        </div>
        <Dog look={dog.look} pose="perk" size={56} shadow={false} />
      </div>
      <div style={{ padding: '0 16px calc(var(--safe-bottom) + 30px)' }}>
        {UNITS.map((u) => (
          <section key={u.id} style={{ marginTop: 18 }}>
            <div className="card" style={{ padding: '12px 14px', background: u.color, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 19 }}>{u.title}</h3>
                <p style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.9 }}>
                  {u.lessons.filter((l) => s.lessons[l.id]).length}/{u.lessons.length} complete {u.free && u.id === 'understand' ? '· Welfare essentials, always free' : ''}
                </p>
              </div>
              {!u.free && <span style={{ background: '#ffe38a', color: '#3d3a6b', borderRadius: 10, padding: '2px 8px', fontWeight: 900, fontSize: 11 }}>PLUS</span>}
            </div>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 14, padding: '16px 0 4px' }}>
              {u.lessons.map((l, k) => {
                const stars = s.lessons[l.id] ?? 0;
                const locked = l.plus && !s.plus;
                return (
                  <div key={l.id} style={{ transform: `translateX(${[0, 50, -10, -50][k % 4]}px)`, display: 'grid', justifyItems: 'center', gap: 4 }}>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      className="lesson-node"
                      onClick={() => (locked ? onPlus() : setLesson({ l, u }))}
                      style={{ background: locked ? '#cfc6e0' : stars ? `#f5b53d` : u.color, boxShadow: `0 6px 0 ${locked ? '#aea4c4' : stars ? '#c98610' : `color-mix(in srgb, ${u.color} 70%, #000)`}` }}
                    >
                      {locked ? <Icon name="lock" /> : stars ? <Icon name="check" size={30} /> : <Icon name={l.trick ? 'sparkle' : 'book'} size={28} />}
                    </motion.button>
                    <b style={{ fontSize: 13 }}>{l.title}</b>
                    <span className="tiny">
                      {l.minutes} min{l.trick ? ` · unlocks ${l.trick.name}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <AnimatePresence>{lesson && <LessonPlayer key={lesson.l.id} lesson={lesson.l} unit={lesson.u} onClose={() => setLesson(null)} />}</AnimatePresence>
    </motion.div>
  );
}

function LessonPlayer({ lesson, unit, onClose }: { lesson: Lesson; unit: Unit; onClose: () => void }) {
  const { s, actions } = useGame();
  const dog = s.profile!.dog;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [reps, setReps] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);
  const step = lesson.steps[i];
  const last = i === lesson.steps.length - 1;
  const canNext = step.kind === 'learn' || (step.kind === 'quiz' && picked !== null && picked === step.answer) || (step.kind === 'practice' && reps >= step.reps);
  const pose: Pose = done ? (lesson.trick ? TRICK_POSE[lesson.trick.id] ?? 'celebrate' : 'celebrate') : step.kind === 'practice' ? (reps % 2 ? 'happy' : 'perk') : picked !== null && step.kind === 'quiz' ? (picked === step.answer ? 'excited' : 'perk') : 'idle';

  const next = () => {
    if (last) {
      setDone(true);
      return;
    }
    setI(i + 1);
    setPicked(null);
    setReps(0);
  };
  const stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 34 }} style={{ position: 'absolute', inset: 0, zIndex: 5, background: unit.soft, display: 'flex', flexDirection: 'column', padding: 'calc(var(--safe-top) + 14px) 16px calc(var(--safe-bottom) + 20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
        <div className="progress" style={{ flex: 1, height: 14 }}>
          <i style={{ width: `${((done ? lesson.steps.length : i) / lesson.steps.length) * 100}%`, background: unit.color }} />
        </div>
      </div>
      <div style={{ display: 'grid', placeItems: 'center', marginTop: 10 }}>
        <Dog look={dog.look} pose={pose} size={130} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key={i} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="card" style={{ padding: 18 }}>
              <div className="label" style={{ color: unit.color }}>
                {lesson.title} · {step.kind === 'learn' ? 'Learn' : step.kind === 'quiz' ? 'Quick check' : 'Practise together'}
              </div>
              {step.kind === 'learn' && (
                <>
                  <h2 style={{ fontSize: 22, marginTop: 6 }}>{fill(step.title, dog.name)}</h2>
                  <p style={{ marginTop: 8, fontWeight: 600, lineHeight: 1.5 }}>{fill(step.text, dog.name)}</p>
                </>
              )}
              {step.kind === 'quiz' && (
                <>
                  <h2 style={{ fontSize: 20, marginTop: 6 }}>{fill(step.q, dog.name)}</h2>
                  <div className="stack" style={{ marginTop: 12 }}>
                    {step.options.map((o, k) => {
                      const sel = picked === k;
                      const right = k === step.answer;
                      return (
                        <motion.button
                          key={k}
                          animate={sel && !right ? { x: [0, -8, 8, -4, 0] } : {}}
                          className="row"
                          onClick={() => {
                            if (picked === step.answer) return;
                            setPicked(k);
                            if (k !== step.answer) setMistakes((m) => m + 1);
                          }}
                          style={{ border: `2.5px solid ${sel ? (right ? '#5fae7a' : '#ee7f9b') : 'transparent'}`, background: sel ? (right ? '#e9f7e2' : '#fde8ee') : undefined }}
                        >
                          <b style={{ flex: 1 }}>{fill(o, dog.name)}</b>
                          {sel && right && <Icon name="check" />}
                        </motion.button>
                      );
                    })}
                  </div>
                  {picked !== null && (
                    <p style={{ marginTop: 10, fontWeight: 700, color: picked === step.answer ? '#3f9a48' : '#c4516f' }}>
                      {picked === step.answer ? fill(step.explain, dog.name) : 'Not quite — have another think!'}
                    </p>
                  )}
                </>
              )}
              {step.kind === 'practice' && (
                <>
                  <h2 style={{ fontSize: 22, marginTop: 6 }}>{fill(step.title, dog.name)}</h2>
                  <p style={{ marginTop: 8, fontWeight: 600 }}>{fill(step.text, dog.name)}</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '14px 0' }}>
                    {Array.from({ length: step.reps }, (_, k) => (
                      <motion.span key={k} animate={k < reps ? { scale: [1, 1.3, 1] } : {}} style={{ width: 26, height: 26, borderRadius: 13, background: k < reps ? unit.color : '#eee6f8', display: 'grid', placeItems: 'center', color: '#fff' }}>
                        {k < reps && <Icon name="check" size={14} />}
                      </motion.span>
                    ))}
                  </div>
                  <button className="btn sky full" disabled={reps >= step.reps} onClick={() => setReps(reps + 1)}>
                    “Yes!” + treat
                  </button>
                  <p className="tiny" style={{ marginTop: 8, textAlign: 'center' }}>
                    Not today? That’s fine — tap through, and try for real later.
                  </p>
                  {reps < step.reps && (
                    <button className="tiny" style={{ display: 'block', margin: '4px auto 0', textDecoration: 'underline' }} onClick={() => setReps(step.reps)}>
                      We’ll practise later
                    </button>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ padding: 20, textAlign: 'center' }}>
              <h2 style={{ fontSize: 26 }}>Lesson complete!</h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, margin: '10px 0' }}>
                {[0, 1, 2].map((k) => (
                  <Star key={k} size={40} dim={k >= stars} />
                ))}
              </div>
              {lesson.trick && (
                <p style={{ fontWeight: 700 }}>
                  {dog.name} can now do <b>{lesson.trick.name}</b> on the island and in puzzles — and you earned a special booster!
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!done ? (
        <button className="btn full" disabled={!canNext} onClick={next} style={{ marginTop: 12 }}>
          {last ? 'Finish' : 'Continue'}
        </button>
      ) : (
        <button
          className="btn gold full"
          style={{ marginTop: 12 }}
          onClick={() => {
            actions.completeLesson(lesson.id, stars);
            onClose();
          }}
        >
          Collect rewards
        </button>
      )}
    </motion.div>
  );
}
