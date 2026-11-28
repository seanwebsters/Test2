import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Dog } from '../art/Dog';
import { Coin, Icon, Seed } from '../art/Icons';
import { Island } from '../art/Island';
import { COMMUNITY, GIFTS, SHARED } from '../game/data';
import { useGame } from '../game/store';
import type { Friend } from '../game/types';
import { dayKey, phaseOf } from '../game/util';
import { Sheet, Sim, Sky } from '../ui/Common';

export function FriendsScreen() {
  const { s, actions } = useGame();
  const dog = s.profile!.dog;
  const [visit, setVisit] = useState<Friend | null>(null);
  const [gift, setGift] = useState<Friend | null>(null);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState('');
  const today = dayKey();
  const myCode = useMemo(() => `${dog.name.toUpperCase().slice(0, 5)}-${(s.profile!.createdAt % 9000) + 1000}`, [dog.name, s.profile]);
  const community = COMMUNITY.base + s.community.contributed * 7;

  return (
    <div className="screen" style={{ background: 'var(--sky-flat)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 26 }}>Neighbourhood</h1>
        <button className="btn sm lav" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} /> Add
        </button>
      </div>
      <div style={{ marginTop: 6 }}>
        <Sim>Demo neighbours — social features are simulated in this prototype</Sim>
      </div>

      {/* neighbourhood map */}
      <div style={{ position: 'relative', height: 250, marginTop: 12, borderRadius: 28, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <Sky phase="day" />
        <svg viewBox="0 0 360 250" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          {s.friends.slice(0, 5).map((f, i) => {
            const pos = [
              [70, 80],
              [270, 70],
              [180, 150],
              [60, 190],
              [300, 190],
            ][i];
            return (
              <g key={f.id} transform={`translate(${pos[0]} ${pos[1]})`} onClick={() => setVisit(f)} style={{ cursor: 'pointer' }}>
                <g className="bob" style={{ animationDelay: `${-i * 1.3}s` }}>
                  <path d="M-40 0 Q0 -10 40 0 Q30 34 0 44 Q-30 34 -40 0Z" fill="#a8795a" />
                  <ellipse rx="42" ry="12" fill="#9fd27e" />
                  <circle cx="-22" cy="-14" r="10" fill={['#f59cc2', '#6faa4c', '#ffd36e', '#8cc77a', '#c7b2f2'][i]} />
                  <rect x="-24" y="-6" width="3" height="6" fill="#7a5233" />
                  <g transform="translate(-12 -46)">
                    <Dog look={f.dog.look} size={34} pose={f.online ? 'happy' : 'sleep'} shadow={false} />
                  </g>
                  <rect x="-34" y="18" width="68" height="16" rx="8" fill="#fffaf0" />
                  <text y="30" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="Nunito Variable" fill="#3b2f5c">
                    {f.islandName}
                  </text>
                  {f.online && <circle cx="30" cy="-6" r="4" fill="#5fae7a" stroke="#fff" strokeWidth="1.5" />}
                </g>
              </g>
            );
          })}
          {/* your island bridge hint */}
          <path d="M180 150 Q130 110 70 80 M180 150 Q230 110 270 70" stroke="#fff" strokeWidth="2" strokeDasharray="3 6" fill="none" opacity=".8" />
        </svg>
      </div>

      {/* community */}
      <div className="section-title">
        <h3>Weekly community challenge</h3>
      </div>
      <div className="card" style={{ padding: 16, background: '#f7e2c4' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <svg viewBox="0 0 48 48" width="52" height="52">
            <rect x="18" y="4" width="12" height="8" rx="2" fill="#7a5233" />
            <path d="M10 14 Q24 6 38 14 L36 40 Q24 46 12 40Z" fill="#e9a04a" />
            <circle cx="24" cy="27" r="8" fill="#ffe38a" className="glowpulse" />
          </svg>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 18 }}>{COMMUNITY.title}</h4>
            <p className="tiny" style={{ color: 'var(--ink-2)' }}>{COMMUNITY.blurb}</p>
          </div>
        </div>
        <div className="progress gold" style={{ marginTop: 12, height: 14 }}>
          <i style={{ width: `${Math.min(1, community / COMMUNITY.goal) * 100}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }} className="tiny">
          <span>{community.toLocaleString('en-GB')} sniffs</span>
          <span>Goal {COMMUNITY.goal.toLocaleString('en-GB')}</span>
        </div>
        <div className="label" style={{ marginTop: 12 }}>
          Your contribution: {s.community.contributed} sniffs
        </div>
        <div className="stack" style={{ marginTop: 8 }}>
          {COMMUNITY.tiers.map((t, i) => {
            const ok = s.community.contributed >= t.at;
            const claimed = s.community.claimed.includes(i);
            return (
              <div key={i} className="row" style={{ padding: 8 }}>
                <b style={{ width: 54, fontFamily: 'var(--font-display)' }}>{t.at}</b>
                <span style={{ flex: 1, fontWeight: 700 }}>{t.reward}</span>
                <button className="btn gold xs" disabled={!ok || claimed} onClick={() => actions.claimCommunity(i)}>
                  {claimed ? 'Claimed' : ok ? 'Claim' : 'Locked'}
                </button>
              </div>
            );
          })}
        </div>
        <p className="tiny" style={{ marginTop: 8 }}>Earn sniffs with “Senses” quests and sniff stops on adventures.</p>
      </div>

      {/* shared */}
      <div className="section-title">
        <h3>Shared adventures</h3>
      </div>
      <div className="stack">
        {SHARED.map((sh) => {
          const f = s.friends.find((x) => x.id === sh.friend);
          if (!f) return null;
          const mine = s.sharedProgress[sh.id] ?? 0;
          const theirs = Math.round(sh.goal * 0.35);
          const total = Math.min(sh.goal, mine + theirs);
          return (
            <div key={sh.id} className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', marginRight: -6 }}>
                <Dog look={dog.look} size={40} shadow={false} />
                <div style={{ marginLeft: -16 }}>
                  <Dog look={f.dog.look} size={40} shadow={false} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <h4>{sh.title}</h4>
                <p>
                  With {f.dog.name} · {total}/{sh.goal} {sh.unit}
                </p>
                <div className="progress" style={{ marginTop: 6, height: 8 }}>
                  <i style={{ width: `${(total / sh.goal) * 100}%` }} />
                </div>
                <p className="tiny" style={{ marginTop: 4 }}>
                  Reward: {sh.reward} · You {mine}, {f.dog.name} {theirs}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* friends list */}
      <div className="section-title">
        <h3>Friends</h3>
        <span className="tiny">{s.friends.length} neighbours</span>
      </div>
      <div className="stack">
        {s.friends.map((f) => (
          <div key={f.id} className="row">
            <div className="thumb" style={{ background: '#efe9fc', overflow: 'hidden' }}>
              <Dog look={f.dog.look} size={50} shadow={false} pose={f.online ? 'idle' : 'sleep'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4>
                {f.dog.name} <span className="tiny">& {f.ownerName}</span>
              </h4>
              <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>“{f.status}”</p>
              <span className="tiny">
                {f.dog.breed} · Friendship {f.level}
              </span>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <button className="btn sky xs" onClick={() => setVisit(f)}>
                Visit
              </button>
              <button className="btn rose xs" onClick={() => setGift(f)}>
                <Icon name="gift" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!gift} onClose={() => setGift(null)} title={gift ? `Send ${gift.dog.name} a gift` : ''}>
        <div className="stack">
          {GIFTS.map((g) => {
            const usedWave = g.id === 'wave' && gift?.giftedToday === today;
            const can = g.id === 'treats' ? s.coins >= 25 : g.id === 'flower' ? s.seeds >= 1 : !usedWave;
            return (
              <button
                key={g.id}
                className="row"
                disabled={!can}
                style={{ opacity: can ? 1 : 0.5 }}
                onClick={() => {
                  if (gift) actions.sendGift(gift.id, g.id);
                  setGift(null);
                }}
              >
                <div className="thumb" style={{ background: '#fbe1e8' }}>
                  {g.id === 'treats' ? <Coin size={30} /> : g.id === 'flower' ? <Seed size={28} /> : <Icon name="hand" size={28} />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4>{g.name}</h4>
                  <p>{usedWave ? 'Already waved today' : g.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a friend">
        <div className="paper" style={{ padding: 16, textAlign: 'center' }}>
          <div className="label">Your island code</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, letterSpacing: '.06em', marginTop: 4 }}>{myCode}</div>
          <p className="tiny">Share it with friends from the park!</p>
        </div>
        <div className="label" style={{ marginTop: 16 }}>
          Enter a friend’s code
        </div>
        <input className="field" style={{ marginTop: 6 }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. BISCUIT-4821" />
        <button
          className="btn full"
          style={{ marginTop: 14 }}
          disabled={code.trim().length < 3}
          onClick={() => {
            actions.addFriend(code.trim());
            setCode('');
            setAdding(false);
          }}
        >
          Add neighbour
        </button>
        <p className="tiny" style={{ marginTop: 8, textAlign: 'center' }}>
          <span className="sim">Simulated</span> Any code adds a demo neighbour in this prototype.
        </p>
      </Sheet>

      <AnimatePresence>{visit && <Visit f={visit} onClose={() => setVisit(null)} onGift={() => setGift(visit)} />}</AnimatePresence>
    </div>
  );
}

function Visit({ f, onClose, onGift }: { f: Friend; onClose: () => void; onGift: () => void }) {
  const phase = phaseOf();
  const view = useMemo(
    () => ({
      restored: ['bridge', 'blossom', 'cottage', 'waterfall', ...(f.level >= 5 ? ['woods'] : []), ...(f.level >= 7 ? ['grotto', 'islet'] : [])],
      placed: f.decorations.map((d, i) => ({ uid: `${f.id}${i}`, itemId: d, x: [330, 470, 520, 380, 600][i % 5], y: [440, 420, 360, 340, 440][i % 5] })),
      creatures: ['cloudpup', 'mossbun', 'glowmoth'].slice(0, Math.max(1, f.level - 4)),
      plots: [],
      look: f.dog.look,
      plus: f.level >= 8,
      name: f.islandName,
    }),
    [f],
  );
  return (
    <motion.div initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, zIndex: 55, overflow: 'hidden' }}>
      <Sky phase={phase} />
      <div style={{ position: 'absolute', inset: '110px -40% 80px -40%' }}>
        <Island view={view} phase={phase} dogPos={{ x: 420, y: 430 }} dogPose="happy" />
      </div>
      <div style={{ position: 'absolute', top: 'calc(var(--safe-top) + 14px)', left: 14, right: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="icon-btn" onClick={onClose} aria-label="Back">
          <Icon name="back" />
        </button>
        <div className="glass" style={{ borderRadius: 18, padding: '8px 14px', flex: 1 }}>
          <h3 style={{ fontSize: 18 }}>{f.islandName}</h3>
          <p className="tiny">
            {f.dog.name} & {f.ownerName} · Friendship {f.level}
          </p>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 'calc(var(--safe-bottom) + 24px)', left: 16, right: 16, display: 'grid', gap: 10 }}>
        <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Dog look={f.dog.look} size={50} pose="happy" shadow={false} />
          <p className="hand" style={{ fontSize: 21, flex: 1 }}>
            “{f.status}”
          </p>
        </div>
        <button className="btn rose full" onClick={onGift}>
          <Icon name="gift" /> Leave a gift
        </button>
      </div>
    </motion.div>
  );
}
