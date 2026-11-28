import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Glyph } from '../components/Glyph';
import { Icon } from '../components/Icon';
import { Button, Progress } from '../components/ui';
import type { GlyphName } from '../data/types';

const COLS = 6, ROWS = 5;
type RoomType = 'living' | 'kitchen' | 'bed' | 'bath' | 'study' | 'boot';
const ROOMS: Record<RoomType, { label: string; w: number; h: number; cost: number; color: string; glyph: GlyphName }> = {
  living: { label: 'Living room', w: 2, h: 2, cost: 34, color: '#FFB86B', glyph: 'house' },
  kitchen: { label: 'Kitchen', w: 2, h: 1, cost: 26, color: '#FFE066', glyph: 'chef' },
  bed: { label: 'Bedroom', w: 2, h: 2, cost: 22, color: '#B794FF', glyph: 'moon' },
  bath: { label: 'Bathroom', w: 1, h: 1, cost: 14, color: '#8FD3FF', glyph: 'drop' },
  study: { label: 'Study', w: 1, h: 1, cost: 10, color: '#9BE22F', glyph: 'laptop' },
  boot: { label: 'Boot room', w: 1, h: 1, cost: 8, color: '#FF9F8E', glyph: 'paw' },
};
interface Placed { id: number; type: RoomType; x: number; y: number; w: number; h: number }

export interface PlanResult { cost: number; checks: Record<string, boolean>; score: number }

export function FloorPlan({ onSubmit }: { onSubmit: (r: PlanResult) => void }) {
  const [rooms, setRooms] = useState<Placed[]>([]);
  const [sel, setSel] = useState<RoomType>('living');
  const [rot, setRot] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const occ = useMemo(() => {
    const m: (number | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    rooms.forEach((r) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) m[y][x] = r.id; });
    return m;
  }, [rooms]);

  const place = (x: number, y: number) => {
    const hit = occ[y][x];
    if (hit !== null) { setRooms(rooms.filter((r) => r.id !== hit)); setMsg('Room removed.'); return; }
    const def = ROOMS[sel];
    const w = rot ? def.h : def.w, h = rot ? def.w : def.h;
    if (x + w > COLS || y + h > ROWS) { setMsg('That doesn’t fit on the plot — try another spot or rotate.'); return; }
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (occ[yy][xx] !== null) { setMsg('That overlaps another room.'); return; }
    setRooms([...rooms, { id: Date.now(), type: sel, x, y, w, h }]);
    setMsg(null);
  };

  const count = (t: RoomType) => rooms.filter((r) => r.type === t).length;
  const cost = rooms.reduce((s, r) => s + ROOMS[r.type].cost, 0);
  const living = rooms.filter((r) => r.type === 'living');
  const kitchens = rooms.filter((r) => r.type === 'kitchen');
  const adj = (a: Placed, b: Placed) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h && !((a.x === b.x + b.w || b.x === a.x + a.w) && (a.y === b.y + b.h || b.y === a.y + a.h));
  const checks: Record<string, boolean> = {
    'Two bedrooms (parents + child)': count('bed') >= 2,
    'At least one bathroom': count('bath') >= 1,
    'A kitchen': count('kitchen') >= 1,
    'Living room faces the south garden': living.some((r) => r.y + r.h === ROWS),
    'Kitchen next to the living room': kitchens.some((k) => living.some((l) => adj(k, l))),
    'Study for working from home': count('study') >= 1,
    'Boot room for the muddy dog': count('boot') >= 1,
    'Rooms within £160k (leaves room for materials)': cost <= 160 && rooms.length > 0,
  };
  const met = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {(Object.keys(ROOMS) as RoomType[]).map((t) => (
          <button key={t} onClick={() => setSel(t)} aria-pressed={sel === t}
            className={`flex shrink-0 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left ${sel === t ? 'border-grape-500 bg-grape-50' : 'border-grape-100 bg-white'}`}>
            <Glyph name={ROOMS[t].glyph} size={28} />
            <span><span className="block text-sm font-extrabold leading-tight">{ROOMS[t].label}</span><span className="text-[11px] font-bold text-ink-400">{ROOMS[t].w}×{ROOMS[t].h} · £{ROOMS[t].cost}k</span></span>
          </button>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs font-bold text-ink-400">Street (north)</span>
        <button onClick={() => setRot(!rot)} className="flex items-center gap-1 rounded-full bg-grape-50 px-3 py-1 text-xs font-extrabold text-grape-600"><Icon name="refresh" size={14} />Rotate {rot ? 'on' : 'off'}</button>
      </div>
      <div className="relative mt-1 rounded-2xl border-4 border-[#C9874A] bg-[#F6EFE3] p-1">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const x = i % COLS, y = Math.floor(i / COLS);
            return <button key={i} onClick={() => place(x, y)} aria-label={`Plot cell ${x + 1}, ${y + 1}`} className="aspect-square rounded-lg border-2 border-dashed border-[#E2D3BC] hover:bg-white/60" />;
          })}
        </div>
        {rooms.map((r) => {
          const d = ROOMS[r.type];
          return (
            <motion.button key={r.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={() => place(r.x, r.y)}
              className="absolute flex flex-col items-center justify-center rounded-xl border-2 border-white/80 text-[10px] font-extrabold leading-tight text-ink-900 shadow"
              style={{ background: d.color, left: `calc(${(r.x / COLS) * 100}% + 4px)`, top: `calc(${(r.y / ROWS) * 100}% + 4px)`, width: `calc(${(r.w / COLS) * 100}% - 4px)`, height: `calc(${(r.h / ROWS) * 100}% - 4px)` }}
              aria-label={`${d.label} — tap to remove`}>
              <Glyph name={d.glyph} size={r.w * r.h > 1 ? 30 : 20} />{r.w * r.h > 1 && d.label}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-xs font-extrabold text-lime-700"><Glyph name="tree" size={18} /> Garden (south, sunny)</div>
      {msg && <p className="mt-2 text-center text-sm font-bold text-coral-500">{msg}</p>}

      <div className="mt-3 rounded-2xl bg-cloud p-3">
        <div className="flex justify-between text-sm font-extrabold"><span>Room budget</span><span className={cost > 160 ? 'text-coral-500' : 'text-ink-700'}>£{cost}k / £160k</span></div>
        <Progress value={cost / 160} color={cost > 160 ? '#FF5A45' : '#7C3AED'} h={10} className="mt-1" />
        <ul className="mt-3 grid gap-1.5">
          {Object.entries(checks).map(([k, v]) => (
            <li key={k} className={`flex items-center gap-2 text-sm font-bold ${v ? 'text-lime-700' : 'text-ink-400'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${v ? 'bg-lime-400 text-[#1F3A00]' : 'bg-white'}`}>{v && <Icon name="check" size={12} stroke={3.5} />}</span>{k}
            </li>
          ))}
        </ul>
      </div>
      <Button tone="lime" full size="lg" className="mt-4" disabled={rooms.length < 3} onClick={() => onSubmit({ cost, checks, score: (met / total) * (cost <= 160 ? 1 : 0.7) })}>
        Submit plan ({met}/{total})
      </Button>
    </div>
  );
}
