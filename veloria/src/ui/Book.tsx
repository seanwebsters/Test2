import { useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { CHAPTERS, LETTERS, LetterId, STEP, StoryPage } from '../game/story';
import { Illustration, cgFile } from './Art';
import { IconBack, IconClose, IconEnvelope, IconLock, IconNext } from './Icons';
import { sfx } from '../game/audio';

export function Book() {
  const book = useGame((s) => s.book);
  const closeBook = useGame((s) => s.closeBook);
  const setBook = useGame((s) => s.setBook);
  const step = useGame((s) => s.step);
  if (!book.open) return null;
  const prologue = step === STEP.prologue;
  return (
    <div className="book-overlay">
      <div className={`book ${book.view}`}>
        <div className="book-spine" />
        {!prologue && book.view !== 'end' && (
          <button className="icon-btn book-close" onClick={closeBook} aria-label="Close book">
            <IconClose />
          </button>
        )}
        {book.view === 'chapters' && <Chapters />}
        {book.view === 'chapter' && <ChapterPages />}
        {book.view === 'letters' && <Letters />}
        {book.view === 'letter' && book.letter && <LetterView id={book.letter} />}
        {book.view === 'end' && <ChapterEnd />}
        {book.view === 'moments' && <Moments />}
        {(book.view === 'chapters' || book.view === 'letters' || book.view === 'moments') && (
          <div className="book-tabs">
            <button className={book.view === 'chapters' ? 'on' : ''} onClick={() => (sfx('page'), setBook({ view: 'chapters' }))}>
              Chapters
            </button>
            <button className={book.view === 'letters' ? 'on' : ''} onClick={() => (sfx('page'), setBook({ view: 'letters' }))}>
              Letters
            </button>
            <button className={book.view === 'moments' ? 'on' : ''} onClick={() => (sfx('page'), setBook({ view: 'moments' }))}>
              Moments
            </button>
          </div>
        )}
        <Corner />
      </div>
    </div>
  );
}

function Corner() {
  return (
    <svg className="book-corner" viewBox="0 0 120 120" aria-hidden>
      {[
        [96, 24, 13, '#e7a7b3'],
        [76, 14, 9, '#f0c4cc'],
        [106, 46, 9, '#d9a5c6'],
      ].map(([x, y, r, c], i) => (
        <g key={i}>
          {[0, 1, 2, 3, 4].map((k) => (
            <ellipse key={k} cx={x as number} cy={(y as number) - (r as number) * 0.55} rx={(r as number) * 0.42} ry={(r as number) * 0.6} fill={c as string} transform={`rotate(${k * 72} ${x} ${y})`} />
          ))}
          <circle cx={x as number} cy={y as number} r={(r as number) * 0.28} fill="#f6e3b4" />
        </g>
      ))}
      <path d="M60 6 C80 20 92 30 118 34" stroke="#8aa082" strokeWidth="1.4" fill="none" />
      <path d="M70 12 C66 4 74 2 78 6 Z M90 24 C92 14 100 16 100 20Z" fill="#a9bea0" />
    </svg>
  );
}

function Chapters() {
  const step = useGame((s) => s.step);
  const setBook = useGame((s) => s.setBook);
  return (
    <div className="page-inner">
      <h1 className="script-title">The Story</h1>
      <div className="flourish">❦</div>
      <div className="chapter-list">
        {CHAPTERS.map((c, i) => {
          const open = step >= c.unlock;
          return (
            <button
              key={c.num}
              className={`chapter-row ${open ? '' : 'locked'}`}
              disabled={!open}
              onClick={() => {
                sfx('page');
                setBook({ view: 'chapter', chapter: i, page: 0 });
              }}
            >
              <div className="chapter-thumb">{open && c.pages[0] ? <Illustration art={c.pages[0].art} /> : <IconLock />}</div>
              <div className="chapter-meta">
                <div className="chapter-num">Chapter {c.num}</div>
                <div className="chapter-name">{c.title}</div>
              </div>
              {open && (
                <span className="chapter-go">
                  <IconNext />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PageFace({ page, unlocked, chapterNum }: { page: StoryPage; unlocked: boolean; chapterNum: string }) {
  return (
    <div className="page-face">
      <div className="page-art">
        <Illustration art={page.art} className={unlocked ? '' : 'veiled'} />
      </div>
      <div className="page-chapter">Chapter {chapterNum}</div>
      <h2 className="page-title">{unlocked ? page.title : '· · ·'}</h2>
      <div className="page-text">
        {unlocked ? page.text.map((t, i) => <p key={i}>{t}</p>) : <p className="unwritten">This page has not been written yet. Keep living the story, and the ink will find it.</p>}
      </div>
    </div>
  );
}

function ChapterPages() {
  const book = useGame((s) => s.book);
  const setBook = useGame((s) => s.setBook);
  const step = useGame((s) => s.step);
  const closeBook = useGame((s) => s.closeBook);
  const ch = CHAPTERS[book.chapter];
  const [flip, setFlip] = useState<{ from: number; dir: 1 | -1; k: number } | null>(null);
  const prologue = step === STEP.prologue;
  const pages = prologue ? ch.pages.slice(0, 1) : ch.pages;
  const page = pages[book.page];

  useEffect(() => {
    if (!flip) return;
    const t = setTimeout(() => setFlip(null), 760);
    return () => clearTimeout(t);
  }, [flip]);

  const go = (d: 1 | -1) => {
    const n = book.page + d;
    if (n < 0 || n >= pages.length) return;
    sfx('page');
    setFlip({ from: book.page, dir: d, k: Date.now() });
    setBook({ page: n });
  };

  if (!page) return null;
  return (
    <div className="page-inner pages">
      {!prologue && (
        <button className="icon-btn book-back" onClick={() => (sfx('page'), setBook({ view: 'chapters' }))} aria-label="Back to chapters">
          <IconBack />
        </button>
      )}
      <div className="page-stack">
        <div key={`cur${book.page}`} className={`page-sheet ${flip?.dir === -1 ? 'flip-in' : ''}`}>
          <PageFace page={page} unlocked={step >= page.unlock} chapterNum={ch.num} />
        </div>
        {flip && flip.dir === 1 && (
          <div key={`old${flip.k}`} className="page-sheet flip-out">
            <PageFace page={pages[flip.from]} unlocked={step >= pages[flip.from].unlock} chapterNum={ch.num} />
          </div>
        )}
      </div>
      <div className="page-nav">
        <button className="icon-btn" disabled={book.page === 0} onClick={() => go(-1)} aria-label="Previous page">
          <IconBack />
        </button>
        <span className="page-num">
          {book.page + 1} of {pages.length}
        </span>
        {prologue ? (
          <button className="btn primary" onClick={() => (sfx('page'), closeBook())}>
            Close your eyes
          </button>
        ) : (
          <button className="icon-btn" disabled={book.page >= pages.length - 1} onClick={() => go(1)} aria-label="Next page">
            <IconNext />
          </button>
        )}
      </div>
    </div>
  );
}

function Letters() {
  const letters = useGame((s) => s.letters);
  const read = useGame((s) => s.lettersRead);
  const readLetter = useGame((s) => s.readLetter);
  const all = Object.keys(LETTERS) as LetterId[];
  return (
    <div className="page-inner">
      <h1 className="script-title">Letters</h1>
      <div className="flourish">❦</div>
      <div className="letter-list">
        {all.map((id) => {
          const have = letters.includes(id);
          const L = LETTERS[id];
          return (
            <button key={id} className={`letter-row ${have ? '' : 'locked'}`} disabled={!have} onClick={() => readLetter(id)}>
              <IconEnvelope sealed={have && !read.includes(id)} />
              <div className="chapter-meta">
                <div className="chapter-name">{have ? L.title : 'A letter not yet found'}</div>
                <div className="chapter-num">{have ? L.from : 'Somewhere in Veloria'}</div>
              </div>
              {have && !read.includes(id) && <span className="new-dot">new</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LetterView({ id }: { id: LetterId }) {
  const setBook = useGame((s) => s.setBook);
  const L = LETTERS[id];
  return (
    <div className="page-inner">
      <button className="icon-btn book-back" onClick={() => (sfx('page'), setBook({ view: 'letters' }))} aria-label="Back to letters">
        <IconBack />
      </button>
      <div className="letter-paper unfold">
        <div className="letter-title">{L.title}</div>
        {L.body.map((b, i) => (
          <p key={i} className="hand">
            {b}
          </p>
        ))}
        <p className="hand sign">{L.sign}</p>
        <div className="wax" />
      </div>
    </div>
  );
}

const ENDS = [
  {
    art: 'alone' as const,
    num: 'I',
    title: 'The City That Never Woke',
    text: ['You wake in your own bed, the novel still open on your chest. The lamp is still burning.', 'Behind your ear, impossibly, there is the faint scent of roses.'],
  },
  {
    art: 'bell' as const,
    num: 'II',
    title: 'You Came Back',
    text: ['The hours are coming back to Veloria, one by one. So is he.', 'Tonight, when you sleep, someone else in the city will be awake.'],
  },
  {
    art: 'dance' as const,
    num: 'III',
    title: 'A Night Without End',
    text: ['You wake with lantern light still in your eyes, and two names on your lips.', 'One of them walked away from you on a bridge. The other would stay forever so that you could leave.'],
  },
];

function ChapterEnd() {
  const book = useGame((s) => s.book);
  const sleepAgain = useGame((s) => s.sleepAgain);
  const closeBook = useGame((s) => s.closeBook);
  const e = ENDS[book.chapter] ?? ENDS[0];
  const last = book.chapter >= 2;
  return (
    <div className="page-inner end">
      <div className="page-art tall">
        <Illustration art={e.art} />
      </div>
      <div className="page-chapter">End of Chapter {e.num}</div>
      <h2 className="page-title">{e.title}</h2>
      <div className="page-text">
        {e.text.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
        {last && (
          <p className="next-up">
            Chapter IV · <em>The Cost of Time</em>
            <br />
            <span>Arrives in a coming update. Until then, the city is yours, and so are they.</span>
          </p>
        )}
      </div>
      {last ? (
        <button className="btn primary wide" onClick={closeBook}>
          Return to Veloria
        </button>
      ) : (
        <button className="btn primary wide" onClick={sleepAgain}>
          Fall asleep again
        </button>
      )}
    </div>
  );
}

const MOMENTS: { id: string; title: string }[] = [
  { id: 'cg_tree', title: 'Beneath the Blossom' },
  { id: 'cg_meet', title: 'The Clock Begins' },
  { id: 'cg_fountain', title: 'What the Water Remembered' },
  { id: 'cg_garden', title: 'A Rose Behind Your Ear' },
  { id: 'cg_alone', title: 'Not Tonight' },
  { id: 'cg_return', title: 'You Came Back' },
  { id: 'cg_bookshop', title: 'Hollow & Quill' },
  { id: 'cg_bell', title: 'The Great Bell' },
  { id: 'cg_cassian', title: 'The Lamplighter' },
  { id: 'cg_dance', title: 'The Lantern Festival' },
  { id: 'cg_cassclose', title: 'Unless You Mean It' },
  { id: 'cg_jealous', title: 'The Bridge' },
  { id: 'cg_boats', title: 'Paper Boats' },
  { id: 'cg_ledge', title: 'The Highest Window' },
  { id: 'cg_almost', title: 'Beneath the Clock' },
];

function Moments() {
  const seen = useGame((s) => s.seenCg);
  const look = useGame((s) => s.look);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="page-inner">
      <h1 className="script-title">Moments</h1>
      <div className="flourish">
        {seen.filter((x) => MOMENTS.some((m) => m.id === x)).length} of {MOMENTS.length}
      </div>
      <div className="moments">
        {MOMENTS.map((m) => {
          const have = seen.includes(m.id);
          return (
            <button key={m.id} className={`moment ${have ? '' : 'locked'}`} disabled={!have} onClick={() => (sfx('page'), setOpen(m.id))}>
              <img src={cgFile(m.id, look)} alt="" draggable={false} />
              <span>{have ? m.title : '· · ·'}</span>
            </button>
          );
        })}
      </div>
      {open && (
        <div className="moment-view" onClick={() => setOpen(null)}>
          <img src={cgFile(open, look)} alt="" draggable={false} />
          <div className="moment-caption">{MOMENTS.find((m) => m.id === open)?.title}</div>
        </div>
      )}
    </div>
  );
}
