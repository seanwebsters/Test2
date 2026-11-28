import { motion } from 'framer-motion';
import { useState } from 'react';
import { Glyph } from '../components/Glyph';
import { Icon } from '../components/Icon';
import { Button } from '../components/ui';

const N = 5;
const WALLS = new Set(['2,2', '2,3', '2,4', '3,0', '0,1']);
const GOAL = { x: 4, y: 0 };
const START = { x: 0, y: 4, d: 1 }; // d: 0=N 1=E 2=S 3=W
type Cmd = 'F' | 'L' | 'R';
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const LABEL: Record<Cmd, string> = { F: 'Forward', L: 'Turn left', R: 'Turn right' };

export function RobotCode({ onSubmit }: { onSubmit: (r: { score: number; attempts: number; length: number }) => void }) {
  const [prog, setProg] = useState<Cmd[]>([]);
  const [bot, setBot] = useState(START);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'crash' | 'short' | 'win'>('idle');
  const [attempts, setAttempts] = useState(0);
  const [active, setActive] = useState(-1);

  const run = async () => {
    setRunning(true); setStatus('idle'); setAttempts((a) => a + 1);
    let b = { ...START };
    setBot(b);
    await new Promise((r) => setTimeout(r, 250));
    for (let i = 0; i < prog.length; i++) {
      setActive(i);
      const c = prog[i];
      if (c === 'L') b = { ...b, d: (b.d + 3) % 4 };
      else if (c === 'R') b = { ...b, d: (b.d + 1) % 4 };
      else {
        const nx = b.x + DX[b.d], ny = b.y + DY[b.d];
        if (nx < 0 || ny < 0 || nx >= N || ny >= N || WALLS.has(`${nx},${ny}`)) { setStatus('crash'); setRunning(false); setActive(-1); return; }
        b = { ...b, x: nx, y: ny };
      }
      setBot(b);
      await new Promise((r) => setTimeout(r, 380));
      if (b.x === GOAL.x && b.y === GOAL.y) { setStatus('win'); setRunning(false); setActive(-1); return; }
    }
    setStatus('short'); setRunning(false); setActive(-1);
  };

  return (
    <div>
      <div className="mx-auto grid max-w-[300px] gap-1.5 rounded-3xl bg-[#1E2A4A] p-2" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
        {Array.from({ length: N * N }, (_, i) => {
          const x = i % N, y = Math.floor(i / N);
          const wall = WALLS.has(`${x},${y}`);
          const goal = x === GOAL.x && y === GOAL.y;
          return (
            <div key={i} className={`relative flex aspect-square items-center justify-center rounded-xl ${wall ? 'bg-[#3B4A75]' : 'bg-[#2A3962]'}`}>
              {wall && <Glyph name="gear" size={30} />}
              {goal && <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}><Glyph name="bolt" size={30} /></motion.span>}
              {bot.x === x && bot.y === y && (
                <motion.div layoutId="bot" className="absolute inset-1 flex items-center justify-center" animate={{ rotate: bot.d * 90 - 90 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                  <Glyph name="robot" size={40} />
                  <span className="absolute right-[-2px] top-1/2 h-0 w-0 -translate-y-1/2 border-y-[5px] border-l-[7px] border-y-transparent border-l-lime-300" />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 min-h-[64px] rounded-2xl border-2 border-dashed border-grape-200 bg-grape-50/50 p-2">
        {prog.length === 0 ? <p className="p-3 text-center text-sm font-bold text-ink-400">Your program is empty. Tap the commands below.</p> : (
          <ol className="flex flex-wrap gap-1.5">
            {prog.map((c, i) => (
              <li key={i}><button disabled={running} onClick={() => setProg(prog.filter((_, j) => j !== i))} aria-label={`Step ${i + 1}: ${LABEL[c]} — tap to remove`}
                className={`flex h-10 items-center gap-1 rounded-xl px-2.5 text-sm font-extrabold text-white ${active === i ? 'ring-4 ring-lime-300' : ''}`} style={{ background: c === 'F' ? '#1CA0F2' : c === 'L' ? '#7C3AED' : '#FF7A1A' }}>
                <span className="text-[10px] opacity-70">{i + 1}</span>{c === 'F' ? '↑' : c === 'L' ? '↺' : '↻'}
              </button></li>
            ))}
          </ol>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(['F', 'L', 'R'] as Cmd[]).map((c) => (
          <Button key={c} size="sm" tone={c === 'F' ? 'sky' : c === 'L' ? 'grape' : 'sun'} disabled={running || prog.length >= 14} onClick={() => { setProg([...prog, c]); setStatus('idle'); setBot(START); }}>{LABEL[c]}</Button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button tone="white" className="flex-1" disabled={running || !prog.length} onClick={() => { setProg([]); setBot(START); setStatus('idle'); }}><Icon name="trash" size={18} />Clear</Button>
        <Button tone="lime" className="flex-[2]" disabled={running || !prog.length} onClick={run}><Icon name="playFill" size={18} />Run</Button>
      </div>
      {status === 'crash' && <p className="mt-3 text-center font-bold text-coral-500">Bonk! Bit hit a wall. That’s a bug — every developer gets them. Tweak and try again.</p>}
      {status === 'short' && <p className="mt-3 text-center font-bold text-sun-600">Bit stopped before the battery. Add more steps.</p>}
      {status === 'win' && (
        <div className="mt-3 text-center">
          <p className="font-bold text-lime-700">Bit is charged! You solved it in {prog.length} commands{attempts > 1 ? ` after ${attempts} runs` : ' first time'}.</p>
          <Button tone="lime" full className="mt-2" onClick={() => onSubmit({ score: attempts <= 1 ? 1 : attempts <= 3 ? 0.85 : 0.7, attempts, length: prog.length })}>Continue</Button>
        </div>
      )}
      {status !== 'win' && attempts >= 3 && <p className="mt-2 text-center text-xs font-bold text-ink-400">Hint: head up the second column, then go right along the second row.</p>}
    </div>
  );
}
