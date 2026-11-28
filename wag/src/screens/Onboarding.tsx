import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Dog } from '../art/Dog';
import { Icon } from '../art/Icons';
import { Island } from '../art/Island';
import { BANDANAS, BREEDS, COATS, ENERGY, FAVOURITES, PERSONALITIES, ageGroup } from '../game/data';
import { useGame } from '../game/store';
import type { CoatId, DogLook, EarStyle, Energy, Favourite, Pattern, Personality } from '../game/types';
import { fileToDataUrl, matchCoat, phaseOf } from '../game/util';
import { Confetti, Sky } from '../ui/Common';

type Step = 'hello' | 'owner' | 'dogname' | 'breed' | 'personality' | 'photo' | 'look' | 'favourites' | 'island';
const ORDER: Step[] = ['hello', 'owner', 'dogname', 'breed', 'personality', 'photo', 'look', 'favourites', 'island'];

export function Onboarding() {
  const { actions } = useGame();
  const [step, setStep] = useState<Step>('hello');
  const [owner, setOwner] = useState('');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [breedQ, setBreedQ] = useState('');
  const [age, setAge] = useState(3);
  const [energy, setEnergy] = useState<Energy>('steady');
  const [traits, setTraits] = useState<Personality[]>([]);
  const [photo, setPhoto] = useState<string | undefined>();
  const [matching, setMatching] = useState(false);
  const [look, setLook] = useState<DogLook>({ coat: 'golden', ears: 'floppy', pattern: 'none', bandana: BANDANAS[0], hat: 'none' });
  const [favs, setFavs] = useState<Favourite[]>([]);
  const [islandName, setIslandName] = useState('');
  const [revealed, setRevealed] = useState(false);
  const idx = ORDER.indexOf(step);
  const go = (d: 1 | -1) => setStep(ORDER[Math.max(0, Math.min(ORDER.length - 1, idx + d))]);
  const dogName = name.trim() || 'your dog';
  const phase = phaseOf();

  const canNext: Record<Step, boolean> = {
    hello: true,
    owner: owner.trim().length > 0,
    dogname: name.trim().length > 0,
    breed: !!breed,
    personality: traits.length > 0,
    photo: true,
    look: true,
    favourites: favs.length > 0,
    island: true,
  };

  const pose = step === 'personality' && traits.length ? 'happy' : step === 'favourites' && favs.length ? 'excited' : step === 'look' ? 'perk' : step === 'dogname' && name ? 'happy' : 'idle';

  const finish = () => {
    actions.start({
      ownerName: owner.trim(),
      islandName: islandName.trim() || `${name.trim()}’s Island`,
      createdAt: Date.now(),
      dog: { name: name.trim(), breed, ageYears: age, personality: traits, favourites: favs, energy, photo, look },
    });
  };

  const breeds = useMemo(() => BREEDS.filter((b) => b.name.toLowerCase().includes(breedQ.toLowerCase())), [breedQ]);

  return (
    <div className="screen" style={{ padding: 0, overflow: 'hidden' }}>
      <Sky phase={phase === 'night' ? 'sunset' : 'day'} />
      {step !== 'hello' && step !== 'island' && (
        <div style={{ position: 'absolute', top: 'calc(var(--safe-top) + 16px)', left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10, zIndex: 3 }}>
          <button className="icon-btn" onClick={() => go(-1)} aria-label="Back">
            <Icon name="back" />
          </button>
          <div className="progress lav" style={{ flex: 1 }}>
            <i style={{ width: `${(idx / (ORDER.length - 1)) * 100}%` }} />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 'hello' && (
          <motion.div key="hello" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -30 }} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
            <motion.div initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.5 }} style={{ marginBottom: -46, zIndex: 0 }}>
              <Dog look={{ ...look, hat: 'explorer' }} pose="wave" size={230} shadow={false} />
            </motion.div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Logo />
            </div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} style={{ fontFamily: 'var(--font-chunk)', fontSize: 22, color: '#fff', textShadow: '0 3px 0 rgba(30,40,20,.2)', marginTop: 26, maxWidth: 320, lineHeight: 1.2 }}>
              Every real-life adventure with your dog brings their world to life.
            </motion.p>
            <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }} className="btn full" style={{ marginTop: 24, maxWidth: 330, minHeight: 66, fontSize: 28 }} onClick={() => go(1)}>
              begin our story
            </motion.button>
          </motion.div>
        )}

        {step !== 'hello' && step !== 'island' && (
          <motion.div key={step} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} style={{ position: 'absolute', inset: 0, padding: 'calc(var(--safe-top) + 70px) 20px calc(var(--safe-bottom) + 110px)', overflowY: 'auto' }}>
            {/* the dog grows with each answer */}
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 170 }}>
              {step === 'owner' ? (
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }} style={{ width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #fff, #e9defc)', display: 'grid', placeItems: 'center', boxShadow: '0 0 60px 10px rgba(255,255,255,.6)' }}>
                  <svg viewBox="0 0 40 40" width="64">
                    <path d="M20 4 L24 16 L36 16 L26 24 L30 36 L20 28 L10 36 L14 24 L4 16 L16 16Z" fill="#ffd36e" />
                  </svg>
                </motion.div>
              ) : step === 'dogname' && !name ? (
                <div style={{ filter: 'brightness(0) opacity(.18)' }}>
                  <Dog look={look} size={150} />
                </div>
              ) : step === 'photo' && photo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <motion.div initial={{ rotate: -10, scale: 0.6 }} animate={{ rotate: -5, scale: 1 }} className="photo-frame">
                    <img src={photo} alt={dogName} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 3, display: 'block' }} />
                  </motion.div>
                  <Dog look={look} pose="excited" size={120} />
                </div>
              ) : (
                <Dog look={look} pose={pose} size={160} />
              )}
              {name && step !== 'owner' && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="banner" style={{ marginTop: -6, fontSize: 18 }}>
                  {name}
                </motion.div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              {step === 'owner' && (
                <>
                  <h2 style={{ fontSize: 28 }}>Hello, traveller.</h2>
                  <p className="muted" style={{ fontWeight: 700, marginTop: 6 }}>
                    A little island is waiting for you somewhere above the clouds. What should we call you?
                  </p>
                  <input className="field" style={{ marginTop: 16 }} autoFocus value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Your first name" onKeyDown={(e) => e.key === 'Enter' && canNext.owner && go(1)} />
                </>
              )}
              {step === 'dogname' && (
                <>
                  <h2 style={{ fontSize: 28 }}>And who’s your best friend?</h2>
                  <p className="muted" style={{ fontWeight: 700, marginTop: 6 }}>
                    Every great story needs a hero with four paws.
                  </p>
                  <input className="field" style={{ marginTop: 16 }} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your dog’s name" onKeyDown={(e) => e.key === 'Enter' && canNext.dogname && go(1)} />
                </>
              )}
              {step === 'breed' && (
                <>
                  <h2 style={{ fontSize: 26 }}>Tell us about {dogName}</h2>
                  <input className="field" style={{ marginTop: 12, fontSize: 18, height: 50 }} value={breedQ} onChange={(e) => setBreedQ(e.target.value)} placeholder="Search breeds…" />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, maxHeight: 150, overflowY: 'auto' }}>
                    {breeds.map((b) => (
                      <button
                        key={b.name}
                        className={`pill-btn ${breed === b.name ? 'on' : ''}`}
                        onClick={() => {
                          setBreed(b.name);
                          setLook((l) => ({ ...l, ...b.look }));
                        }}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                  <div className="label" style={{ marginTop: 18 }}>
                    Age: {age < 1 ? 'under 1 year (puppy!)' : `${age} year${age > 1 ? 's' : ''}`} · {ageGroup(age)}
                  </div>
                  <input type="range" min={0} max={18} value={age} onChange={(e) => setAge(Number(e.target.value))} style={{ width: '100%', marginTop: 8, accentColor: '#8f78e0' }} />
                  <div className="label" style={{ marginTop: 14 }}>
                    Energy & health
                  </div>
                  <div className="stack" style={{ marginTop: 8 }}>
                    {ENERGY.map((e) => (
                      <button key={e.id} className={`pill-btn ${energy === e.id ? 'on' : ''}`} onClick={() => setEnergy(e.id)} style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{e.label}</span>
                        <span className="tiny">{e.line}</span>
                      </button>
                    ))}
                  </div>
                  <p className="tiny" style={{ marginTop: 8 }}>
                    We’ll only suggest activities that suit {dogName}. If in doubt about exercise, ask your vet.
                  </p>
                </>
              )}
              {step === 'personality' && (
                <>
                  <h2 style={{ fontSize: 26 }}>What is {dogName} like?</h2>
                  <p className="muted" style={{ fontWeight: 700, marginTop: 4 }}>
                    Pick up to three. This shapes how {dogName} writes their diary.
                  </p>
                  <div className="grid2" style={{ marginTop: 12 }}>
                    {PERSONALITIES.map((p) => {
                      const on = traits.includes(p.id);
                      return (
                        <motion.button
                          key={p.id}
                          whileTap={{ scale: 0.95 }}
                          className={`tile ${on ? 'sel' : ''}`}
                          onClick={() => setTraits((t) => (on ? t.filter((x) => x !== p.id) : t.length < 3 ? [...t, p.id] : t))}
                          style={{ alignItems: 'flex-start', textAlign: 'left', background: on ? '#fff' : undefined }}
                        >
                          <b style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>{p.label}</b>
                          <span className="tiny">{p.line}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 'photo' && (
                <>
                  <h2 style={{ fontSize: 26 }}>Share a photo of {dogName}</h2>
                  <p className="muted" style={{ fontWeight: 700, marginTop: 4 }}>
                    It stays on your device. We’ll use it to match {dogName}’s colours.
                  </p>
                  <label className="btn sky full" style={{ marginTop: 16 }}>
                    <Icon name="camera" /> {photo ? 'Choose another photo' : 'Choose a photo'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const url = await fileToDataUrl(f, 512, 0.8);
                        setPhoto(url);
                        setMatching(true);
                        const coat: CoatId = await matchCoat(url);
                        setLook((l) => ({ ...l, coat }));
                        setMatching(false);
                      }}
                    />
                  </label>
                  {matching && <p className="tiny" style={{ marginTop: 8 }}>Matching coat colour…</p>}
                  {photo && !matching && (
                    <p className="tiny" style={{ marginTop: 8 }}>
                      <span className="sim live">On-device colour match</span> We think {dogName} is <b>{COATS[look.coat].name}</b>. You can fine-tune next.
                    </p>
                  )}
                </>
              )}
              {step === 'look' && (
                <>
                  <h2 style={{ fontSize: 26 }}>Make a little {dogName}</h2>
                  <p className="muted" style={{ fontWeight: 700, marginTop: 4 }}>
                    This is {dogName}’s island self.
                  </p>
                  <div className="label" style={{ marginTop: 14 }}>
                    Coat
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {(Object.keys(COATS) as CoatId[]).map((c) => (
                      <button key={c} onClick={() => setLook({ ...look, coat: c })} aria-label={COATS[c].name} style={{ width: 40, height: 40, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${COATS[c].light}, ${COATS[c].base} 55%, ${COATS[c].shade})`, boxShadow: look.coat === c ? '0 0 0 3px #fff, 0 0 0 6px var(--lav-deep)' : 'var(--shadow-sm)' }} />
                    ))}
                  </div>
                  <div className="label" style={{ marginTop: 14 }}>
                    Ears
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {(['floppy', 'pointy', 'fold'] as EarStyle[]).map((e) => (
                      <button key={e} className={`pill-btn ${look.ears === e ? 'on' : ''}`} onClick={() => setLook({ ...look, ears: e })}>
                        {e[0].toUpperCase() + e.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="label" style={{ marginTop: 14 }}>
                    Markings
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {(['none', 'blaze', 'patch', 'mask', 'socks'] as Pattern[]).map((p) => (
                      <button key={p} className={`pill-btn ${look.pattern === p ? 'on' : ''}`} onClick={() => setLook({ ...look, pattern: p })}>
                        {p === 'none' ? 'Plain' : p[0].toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="label" style={{ marginTop: 14 }}>
                    Bandana
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {BANDANAS.map((b) => (
                      <button key={b} onClick={() => setLook({ ...look, bandana: b })} style={{ width: 36, height: 36, borderRadius: 12, background: b, boxShadow: look.bandana === b ? '0 0 0 3px #fff, 0 0 0 6px var(--lav-deep)' : 'var(--shadow-sm)' }} aria-label="Bandana colour" />
                    ))}
                  </div>
                </>
              )}
              {step === 'favourites' && (
                <>
                  <h2 style={{ fontSize: 26 }}>What does {dogName} love most?</h2>
                  <p className="muted" style={{ fontWeight: 700, marginTop: 4 }}>
                    Your daily quests will be built around these.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                    {FAVOURITES.map((f) => {
                      const on = favs.includes(f.id);
                      return (
                        <motion.button whileTap={{ scale: 0.92 }} key={f.id} className={`pill-btn ${on ? 'on' : ''}`} onClick={() => setFavs((x) => (on ? x.filter((y) => y !== f.id) : [...x, f.id]))}>
                          {f.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {step === 'island' && (
          <motion.div key="island" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', inset: 0 }}>
            <motion.div initial={{ y: 400, scale: 0.6, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ duration: 2.2, ease: [0.2, 0.8, 0.2, 1] }} style={{ position: 'absolute', left: '-25%', right: '-25%', top: '18%' }}>
              <Island view={{ restored: [], placed: [], creatures: [], plots: [], look, plus: false, name: '' }} phase={phase === 'night' ? 'sunset' : 'day'} dogPos={{ x: 420, y: 420 }} dogPose={revealed ? 'celebrate' : 'happy'} />
            </motion.div>
            {/* parting clouds */}
            {[-1, 1].map((d) => (
              <motion.div key={d} initial={{ x: 0 }} animate={{ x: d * 420 }} transition={{ duration: 2, ease: 'easeInOut' }} style={{ position: 'absolute', top: 0, bottom: 0, [d < 0 ? 'left' : 'right']: 0, width: '60%', background: 'radial-gradient(circle at 50% 50%, #fff 30%, rgba(255,255,255,.0) 70%)', filter: 'blur(4px)' }} />
            ))}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }} style={{ position: 'absolute', top: 'calc(var(--safe-top) + 30px)', left: 20, right: 20, textAlign: 'center' }}>
              <h2 style={{ fontSize: 28, color: '#fff', textShadow: '0 2px 14px rgba(70,40,130,.5)' }}>{revealed ? 'Welcome home.' : `Look, ${owner}! An island, just for ${dogName}.`}</h2>
              <p style={{ color: '#fff', fontWeight: 700, marginTop: 6, textShadow: '0 1px 8px rgba(70,40,130,.5)' }}>
                {revealed ? `The bridge is broken, the tree is just a seedling… but it will grow with every adventure you share.` : 'It’s small now. What shall we call it?'}
              </p>
            </motion.div>
            {revealed && <Confetti n={40} />}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2 }} className="card" style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(var(--safe-bottom) + 20px)', padding: 16 }}>
              {!revealed ? (
                <>
                  <input className="field" value={islandName} onChange={(e) => setIslandName(e.target.value)} placeholder={`${dogName}’s Island`} />
                  <button className="btn full" style={{ marginTop: 12 }} onClick={() => setRevealed(true)}>
                    Name our island
                  </button>
                </>
              ) : (
                <button className="btn full" onClick={finish}>
                  Step onto {islandName.trim() || `${dogName}’s Island`}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {step !== 'hello' && step !== 'island' && (
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 'calc(var(--safe-bottom) + 24px)', zIndex: 3 }}>
          <button className="btn full" disabled={!canNext[step]} onClick={() => go(1)}>
            {step === 'photo' && !photo ? 'Skip for now' : step === 'favourites' ? `Discover ${dogName}’s world` : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
}

export function Logo({ size = 1 }: { size?: number }) {
  const small = 'A LITTLE WORLD'.split('');
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 10, transform: `scale(${size})` }}>
      <div className="tiles" style={{ gap: 3 }}>
        {small.map((ch, i) =>
          ch === ' ' ? (
            <span key={i} style={{ width: 8 }} />
          ) : (
            <motion.span key={i} className="tile-letter small" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.04, type: 'spring', stiffness: 400, damping: 14 }} style={{ width: 24, height: 28, fontSize: 18, transform: `rotate(${(i % 3) - 1}deg)` }}>
              {ch}
            </motion.span>
          ),
        )}
      </div>
      <div className="tiles" style={{ gap: 8 }}>
        {['W', 'A', 'G'].map((ch, i) => (
          <motion.span key={ch} className="tile-letter" initial={{ y: 40, scale: 0.6, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ delay: 0.05 + i * 0.12, type: 'spring', stiffness: 300, damping: 12 }} style={{ width: 92, height: 100, fontSize: 84, transform: `rotate(${[-4, 2, -2][i]}deg)` }}>
            {ch}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
