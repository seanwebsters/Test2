import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { Dog } from '../art/Dog';
import { Heart, Icon } from '../art/Icons';
import { useGame } from '../game/store';
import type { DiaryEntry, DogLook, GardenMemory, SceneKey } from '../game/types';
import { dayKey, prettyDay } from '../game/util';
import { Sheet, Sim } from '../ui/Common';

const SCENES: Record<SceneKey, { sky: [string, string]; ground: string; ground2: string }> = {
  meadow: { sky: ['#cfe8f7', '#f7e6f0'], ground: '#a6d48f', ground2: '#8cc47a' },
  woods: { sky: ['#d4ecd0', '#f4efd8'], ground: '#7fb57a', ground2: '#5f9a5a' },
  sunset: { sky: ['#b49cf0', '#ffc69a'], ground: '#9fbf7a', ground2: '#7fa060' },
  sofa: { sky: ['#f6e3d0', '#fbefe2'], ground: '#d9b8a0', ground2: '#c79e86' },
  beach: { sky: ['#bfe3f7', '#fdf1d6'], ground: '#f3dfb3', ground2: '#e8cf9a' },
  park: { sky: ['#c4e3f7', '#eaf6dc'], ground: '#9fd27e', ground2: '#7fbf5f' },
  night: { sky: ['#2f2a68', '#6b5aa6'], ground: '#4f6f5a', ground2: '#3f5a4a' },
};

export function DiaryScene({ entry, look, svgRef }: { entry: Pick<DiaryEntry, 'scene' | 'props'>; look: DogLook; svgRef?: React.Ref<SVGSVGElement> }) {
  const sc = SCENES[entry.scene] ?? SCENES.meadow;
  const id = `ds-${entry.scene}`;
  return (
    <svg ref={svgRef} viewBox="0 0 320 200" width="100%" style={{ display: 'block', borderRadius: 14 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sc.sky[0]} />
          <stop offset="100%" stopColor={sc.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-sky)`} />
      {entry.scene === 'sunset' && <circle cx="240" cy="110" r="34" fill="#ffd98a" opacity=".9" />}
      {entry.scene === 'night' && (
        <g fill="#fff">
          {[30, 80, 140, 200, 260, 290].map((x, i) => (
            <circle key={x} cx={x} cy={20 + (i % 3) * 18} r="1.6" />
          ))}
          <circle cx="260" cy="40" r="16" fill="#fffbe8" />
        </g>
      )}
      {entry.scene === 'sofa' ? (
        <g>
          <rect x="0" y="0" width="320" height="200" fill="#f8e9d8" />
          <rect x="230" y="20" width="60" height="70" rx="6" fill="#bfe3f7" stroke="#e0c7a8" strokeWidth="6" />
          <rect x="30" y="100" width="260" height="70" rx="26" fill="#9c7ad8" />
          <rect x="20" y="80" width="60" height="90" rx="26" fill="#8c6ad0" />
          <rect x="240" y="80" width="60" height="90" rx="26" fill="#8c6ad0" />
          <rect x="70" y="120" width="180" height="20" rx="10" fill="#b49cf0" />
          <rect x="0" y="170" width="320" height="30" fill="#e2c39f" />
        </g>
      ) : (
        <g>
          <path d="M0 120 Q80 80 160 110 Q240 70 320 100 L320 200 L0 200Z" fill={sc.ground} />
          <path d="M0 150 Q100 120 200 150 Q270 165 320 140 L320 200 L0 200Z" fill={sc.ground2} />
          {(entry.scene === 'woods' || entry.scene === 'park') &&
            [40, 280].map((x) => (
              <g key={x} transform={`translate(${x} 120)`}>
                <rect x="-4" y="-10" width="8" height="20" fill="#7a5233" />
                <circle cy="-30" r="24" fill={entry.scene === 'woods' ? '#4f8a47' : '#6faa4c'} />
                <circle cx="-12" cy="-20" r="14" fill={entry.scene === 'woods' ? '#5f9a5a' : '#8cc77a'} />
              </g>
            ))}
          {entry.scene === 'meadow' && (
            <g transform="translate(270 110)">
              <rect x="-4" y="-10" width="8" height="20" fill="#7a5233" />
              <circle cy="-28" r="24" fill="#f59cc2" />
              <circle cx="14" cy="-18" r="14" fill="#ffc2dc" />
            </g>
          )}
        </g>
      )}
      {entry.props.includes('flowers') &&
        [30, 60, 100, 230, 260, 300].map((x, i) => (
          <g key={x} transform={`translate(${x} ${172 + (i % 2) * 8})`}>
            <path d="M0 0 L0 -10" stroke="#5f9a4a" strokeWidth="1.6" />
            <circle cy="-12" r="4" fill={['#f6a8c4', '#c7b2f2', '#fff3c4'][i % 3]} />
          </g>
        ))}
      {entry.props.includes('leaves') &&
        [70, 210, 250].map((x, i) => <ellipse key={x} cx={x} cy={185 - i * 4} rx="7" ry="4" fill={['#f2b54a', '#e97f32', '#d6a13a'][i]} transform={`rotate(${i * 40} ${x} ${185 - i * 4})`} />)}
      {entry.props.includes('stick') && <path d="M190 176 L250 166 M230 169 L238 158" stroke="#8a5d3b" strokeWidth="6" strokeLinecap="round" />}
      {entry.props.includes('ball') && (
        <g transform="translate(90 172)">
          <circle r="10" fill="#b7e03a" />
          <path d="M-8 -5 Q0 0 -8 6 M8 -6 Q0 0 8 6" stroke="#fff" strokeWidth="2" fill="none" />
        </g>
      )}
      <g transform={`translate(${entry.scene === 'sofa' ? 100 : 110} ${entry.scene === 'sofa' ? 40 : 70})`}>
        <Dog look={look} pose={entry.scene === 'sofa' || entry.scene === 'night' ? 'sleep' : 'happy'} size={100} shadow={entry.scene !== 'sofa'} />
      </g>
    </svg>
  );
}

async function shareCard(entry: DiaryEntry, dogName: string, svg: SVGSVGElement | null, say: (m: string) => void) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#c9b8f0');
  g.addColorStop(1, '#fbe2d2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // paper
  ctx.fillStyle = '#fffaf0';
  ctx.shadowColor = 'rgba(80,50,30,.25)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundRect(ctx, 70, 90, W - 140, H - 200, 44);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  if (svg) {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', '880');
    clone.setAttribute('height', '550');
    const data = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    await new Promise<void>((res) => {
      img.onload = () => res();
      img.onerror = () => res();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
    });
    ctx.save();
    roundRect(ctx, 100, 130, 880, 550, 30);
    ctx.clip();
    try {
      ctx.drawImage(img, 100, 130, 880, 550);
    } catch {
      /* ignore */
    }
    ctx.restore();
  }
  await document.fonts.ready;
  ctx.fillStyle = '#3b2f5c';
  ctx.font = '600 58px "Fredoka Variable", sans-serif';
  ctx.fillText(`${dogName}’s Diary`, 110, 770);
  ctx.fillStyle = '#9a90b3';
  ctx.font = '700 30px "Nunito Variable", sans-serif';
  ctx.fillText(prettyDay(entry.day), 110, 815);
  ctx.fillStyle = '#4a3a5c';
  ctx.font = '46px Caveat, cursive';
  let y = 885;
  const text = entry.body.join(' ');
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > 860) {
      ctx.fillText(line, 110, y);
      y += 56;
      line = w;
      if (y > H - 170) break;
    } else line = t;
  }
  if (y <= H - 170) ctx.fillText(line, 110, y);
  ctx.fillStyle = '#6e5bb8';
  ctx.font = '600 36px "Fredoka Variable", sans-serif';
  ctx.fillText('WAG · a little world for your best friend', 110, H - 60);
  const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/png'));
  if (!blob) return;
  const file = new File([blob], `${dogName}-diary-${entry.day}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `${dogName}’s Diary` });
      return;
    } catch {
      /* cancelled */
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  say('Diary card saved as an image');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function DiaryScreen({ onPlus }: { onPlus: () => void }) {
  const { s } = useGame();
  const [tab, setTab] = useState<'diary' | 'garden' | 'photos'>('diary');
  const dog = s.profile!.dog;
  return (
    <div className="screen" style={{ background: 'var(--lav-bg)' }}>
      <h1 style={{ fontSize: 26 }}>{dog.name}’s Diary</h1>
      <div className="seg" style={{ marginTop: 12 }}>
        <button className={tab === 'diary' ? 'on' : ''} onClick={() => setTab('diary')}>
          Diary
        </button>
        <button className={tab === 'garden' ? 'on' : ''} onClick={() => setTab('garden')}>
          Friendship garden
        </button>
        <button className={tab === 'photos' ? 'on' : ''} onClick={() => setTab('photos')}>
          Photos
        </button>
      </div>
      {tab === 'diary' && <DiaryList onPlus={onPlus} />}
      {tab === 'garden' && <Garden />}
      {tab === 'photos' && <Photos />}
    </div>
  );
}

function DiaryList({ onPlus }: { onPlus: () => void }) {
  const { s, actions, say } = useGame();
  const dog = s.profile!.dog;
  const today = dayKey();
  const todays = s.diary.find((d) => d.day === today);
  const todayActs = s.activities.filter((a) => dayKey(a.ts) === today);
  const evening = new Date().getHours() >= 18;
  const [variant, setVariant] = useState(1);
  const [onlySaved, setOnlySaved] = useState(false);
  const entries = [...s.diary].sort((a, b) => b.day.localeCompare(a.day)).filter((d) => !onlySaved || d.saved);

  return (
    <div>
      {!todays && (
        <div className="paper" style={{ marginTop: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <Dog look={dog.look} pose={evening ? 'sleep' : 'perk'} size={80} />
          <div style={{ flex: 1 }}>
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>{evening ? `${dog.name} is writing tonight’s entry…` : `${dog.name} writes every evening`}</b>
            <p className="tiny" style={{ marginTop: 2 }}>
              {todayActs.length ? `${todayActs.length} moment${todayActs.length > 1 ? 's' : ''} logged today.` : 'Even quiet days get an entry.'} {evening ? '' : 'Entries arrive at 6pm.'}
            </p>
            <button className="btn lav xs" style={{ marginTop: 8 }} onClick={() => actions.writeTonight(0)}>
              {evening ? 'Read it now' : 'Peek early (prototype)'}
            </button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 4px 8px' }}>
        <Sim>Written on-device by WAG’s story engine</Sim>
        <button className={`pill-btn ${onlySaved ? 'on' : ''}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setOnlySaved(!onlySaved)}>
          Saved only
        </button>
      </div>
      <div className="stack" style={{ gap: 18 }}>
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <DiaryPage
              key={e.id}
              entry={e}
              onRewrite={
                e.day === today
                  ? () => {
                      if (!s.plus) return onPlus();
                      actions.writeTonight(variant);
                      setVariant(variant + 1);
                      say('Rewritten in a new mood');
                    }
                  : undefined
              }
            />
          ))}
        </AnimatePresence>
        {!entries.length && <p className="muted" style={{ textAlign: 'center', fontWeight: 700 }}>No saved entries yet — tap the heart on a page you love.</p>}
      </div>
    </div>
  );
}

function DiaryPage({ entry, onRewrite }: { entry: DiaryEntry; onRewrite?: () => void }) {
  const { s, actions, say } = useGame();
  const dog = s.profile!.dog;
  const ref = useRef<SVGSVGElement>(null);
  return (
    <motion.article layout initial={{ opacity: 0, y: 20, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} className="book" style={{ padding: '16px 16px 14px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="label">{prettyDay(entry.day)}</div>
          <h3 style={{ fontSize: 19 }}>{entry.title}</h3>
        </div>
        <button onClick={() => actions.toggleSaved(entry.id)} aria-label="Save entry" style={{ color: '#c83e5e' }}>
          <motion.span animate={entry.saved ? { scale: [1, 1.4, 1] } : {}} style={{ display: 'grid' }}>
            <Heart size={30} filled={entry.saved} />
          </motion.span>
        </button>
      </div>
      <div style={{ marginTop: 10, position: 'relative' }}>
        <DiaryScene entry={entry} look={dog.look} svgRef={ref} />
        {entry.photo && <img src={entry.photo} alt="" style={{ position: 'absolute', right: -6, bottom: -14, width: 84, height: 84, objectFit: 'cover', borderRadius: 4, border: '5px solid #fff', transform: 'rotate(6deg)', boxShadow: 'var(--shadow-sm)' }} />}
      </div>
      <div className="hand" style={{ marginTop: 14 }}>
        {entry.body.map((p, i) => (
          <p key={i} style={{ marginBottom: 2 }}>
            {p}
          </p>
        ))}
        <span style={{ display: 'inline-block', marginTop: 4, color: '#c79a6b' }}>— {dog.name}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {entry.sample && <span className="sim">Sample memory</span>}
        <span className="chip" style={{ boxShadow: 'none', background: '#efe9fc' }}>
          Mood: {entry.mood}
        </span>
        <div style={{ flex: 1 }} />
        {onRewrite && (
          <button className="btn cream xs" onClick={onRewrite}>
            <Icon name="refresh" size={16} /> New mood
          </button>
        )}
        <button className="btn lav xs" onClick={() => shareCard(entry, dog.name, ref.current, say)}>
          <Icon name="share" size={16} /> Share
        </button>
      </div>
    </motion.article>
  );
}

function Plant({ m, x, y, onTap }: { m: GardenMemory; x: number; y: number; onTap: () => void }) {
  const c = `hsl(${m.hue} 70% 75%)`;
  const c2 = `hsl(${m.hue} 60% 62%)`;
  let art: React.ReactNode;
  switch (m.kind) {
    case 'tree':
      art = (
        <g>
          <rect x="-4" y="-26" width="8" height="26" fill="#8a5d3b" />
          <circle cy="-40" r="22" fill="#f59cc2" />
          <circle cx="-12" cy="-32" r="13" fill="#ffc2dc" />
          <circle cx="12" cy="-34" r="12" fill="#e985b4" />
        </g>
      );
      break;
    case 'lantern':
      art = (
        <g>
          <rect x="-1.5" y="-36" width="3" height="36" fill="#6b4a2a" />
          <rect x="-7" y="-46" width="14" height="14" rx="4" fill="#ffd770" className="glowpulse" />
          <circle cy="-39" r="16" fill="#ffe9a8" opacity=".35" />
        </g>
      );
    break;
    case 'crystal':
      art = (
        <g className="glowpulse">
          <path d="M-6 0 L-12 -16 L-4 -34 L4 -16Z" fill="#c8b6f5" />
          <path d="M2 0 L-2 -20 L8 -40 L14 -18Z" fill="#a98be6" />
        </g>
      );
      break;
    case 'mushroom':
      art = (
        <g>
          <rect x="-4" y="-14" width="8" height="14" fill="#fff3e0" />
          <path d="M-14 -12 Q0 -36 14 -12Z" fill="#e9837a" />
          <circle cx="-4" cy="-20" r="2.4" fill="#fff" />
        </g>
      );
      break;
    case 'photo':
      art = (
        <g>
          <path d="M0 0 L0 -22" stroke="#5f9a4a" strokeWidth="2.5" />
          <g transform="translate(0 -40) rotate(-6)">
            <rect x="-16" y="-16" width="32" height="34" rx="2" fill="#fff" />
            {m.photo ? <image href={m.photo} x="-13" y="-13" width="26" height="24" preserveAspectRatio="xMidYMid slice" /> : <rect x="-13" y="-13" width="26" height="24" fill={c} />}
          </g>
        </g>
      );
      break;
    default:
      art = (
        <g>
          <path d="M0 0 Q-2 -14 0 -24" stroke="#5f9a4a" strokeWidth="2.5" fill="none" />
          <ellipse cx="-6" cy="-10" rx="6" ry="3" fill="#7fbf5f" transform="rotate(-30 -6 -10)" />
          <g transform="translate(0 -28)">
            {[0, 72, 144, 216, 288].map((r) => (
              <ellipse key={r} rx="5" ry="8" transform={`rotate(${r}) translate(0 -6)`} fill={c} stroke={c2} strokeWidth="1" />
            ))}
            <circle r="4" fill="#fff3a6" />
          </g>
        </g>
      );
  }
  return (
    <g transform={`translate(${x} ${y})`} onClick={onTap} style={{ cursor: 'pointer' }}>
      <ellipse rx="14" ry="4" fill="#2b4a2a" opacity=".2" />
      <g className="sway">{art}</g>
    </g>
  );
}

function Garden() {
  const { s, actions, say, set } = useGame();
  const dog = s.profile!.dog;
  const [open, setOpen] = useState<GardenMemory | null>(null);
  const [edit, setEdit] = useState(false);
  const [bday, setBday] = useState(dog.birthday ?? '');
  const [adopt, setAdopt] = useState(dog.adoptionDate ?? '');
  const mem = [...s.garden].sort((a, b) => a.ts - b.ts);
  const rows = Math.max(2, Math.ceil(mem.length / 5));
  const h = 80 + rows * 70;
  return (
    <div>
      <p className="muted" style={{ fontWeight: 700, margin: '14px 4px 10px' }}>
        Every milestone you share plants something new. Tap a plant to remember.
      </p>
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <svg viewBox={`0 0 360 ${h}`} width="100%" style={{ display: 'block', background: '#eaf6dc' }}>
          <rect y="40" width="360" height={h} fill="#a6d48f" />
          {Array.from({ length: rows }, (_, r) => (
            <path key={r} d={`M10 ${110 + r * 70} Q180 ${100 + r * 70} 350 ${110 + r * 70}`} stroke="#8a6a4c" strokeWidth="10" opacity=".35" fill="none" strokeLinecap="round" />
          ))}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <rect key={i} x={i * 42 + 6} y="34" width="6" height="22" rx="2" fill="#f6ead0" />
          ))}
          <path d="M0 42 L360 42" stroke="#f6ead0" strokeWidth="3" />
          {mem.map((m, i) => {
            const r = Math.floor(i / 5);
            const col = i % 5;
            return <Plant key={m.id} m={m} x={40 + col * 70 + (r % 2) * 20} y={108 + r * 70} onTap={() => setOpen(m)} />;
          })}
        </svg>
      </div>

      <div className="section-title">
        <h3>Scrapbook</h3>
        <button className="btn cream xs" onClick={() => setEdit(true)}>
          Birthdays & gotcha day
        </button>
      </div>
      <div className="stack">
        {[...mem].reverse().map((m) => (
          <button key={m.id} className="row" onClick={() => setOpen(m)}>
            {m.photo ? <img src={m.photo} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }} /> : <div className="thumb" style={{ background: `hsl(${m.hue} 70% 92%)` }}><svg viewBox="-20 -50 40 54" width="40" height="40"><Plant m={m} x={0} y={0} onTap={() => {}} /></svg></div>}
            <div style={{ flex: 1 }}>
              <h4>{m.title}</h4>
              <p>{new Date(m.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </button>
        ))}
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title}>
        {open?.photo && (
          <div className="photo-frame" style={{ transform: 'rotate(-2deg)', marginBottom: 14 }}>
            <img src={open.photo} alt="" style={{ width: '100%', borderRadius: 4, display: 'block' }} />
          </div>
        )}
        <p className="hand" style={{ fontSize: 25 }}>{open?.text}</p>
        <p className="tiny" style={{ marginTop: 10 }}>{open && new Date(open.ts).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </Sheet>
      <Sheet open={edit} onClose={() => setEdit(false)} title="Special days">
        <div className="label">{dog.name}’s birthday</div>
        <input className="field" style={{ marginTop: 6 }} type="date" value={bday ? `2000-${bday}` : ''} onChange={(e) => setBday(e.target.value.slice(5))} />
        <div className="label" style={{ marginTop: 14 }}>
          Gotcha day (when {dog.name} came home)
        </div>
        <input className="field" style={{ marginTop: 6 }} type="date" value={adopt} onChange={(e) => setAdopt(e.target.value)} />
        <button
          className="btn full"
          style={{ marginTop: 16 }}
          onClick={() => {
            const isNewAdopt = adopt && adopt !== dog.adoptionDate;
            actions.updateDog({ birthday: bday || undefined, adoptionDate: adopt || undefined });
            if (isNewAdopt) set((st) => ({ ...st, garden: [...st.garden, { id: Math.random().toString(36).slice(2), ts: Date.now(), kind: 'flower', title: 'Gotcha day', text: `${dog.name} came home on ${new Date(adopt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. The best day.`, hue: 330 }] }));
            say('Special days saved — WAG will celebrate them with you');
            setEdit(false);
          }}
        >
          Save
        </button>
      </Sheet>
    </div>
  );
}

function Photos() {
  const { s } = useGame();
  const dog = s.profile!.dog;
  const photos = [
    ...(dog.photo ? [{ id: 'dog', src: dog.photo, title: `${dog.name}`, ts: s.profile!.createdAt }] : []),
    ...s.activities.filter((a) => a.photo).map((a) => ({ id: a.id, src: a.photo!, title: a.title, ts: a.ts })),
  ].reverse();
  return (
    <div style={{ marginTop: 14 }}>
      {photos.length === 0 && <p className="muted" style={{ fontWeight: 700 }}>Add photos when you complete quests or adventures — they’ll live here and in the friendship garden.</p>}
      <div className="grid2">
        {photos.map((p, i) => (
          <div key={p.id} className="photo-frame" style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}>
            <img src={p.src} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 3, display: 'block' }} />
            <p className="hand" style={{ fontSize: 18, marginTop: 4 }}>{p.title}</p>
          </div>
        ))}
      </div>
      <p className="tiny" style={{ textAlign: 'center', marginTop: 14 }}>
        Photos are stored privately on this device only.
      </p>
    </div>
  );
}
