import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Scout, ScoutFace } from '../components/Scout';
import { Pill } from '../components/ui';
import { scoutReply, STARTERS, type ScoutCtx } from '../lib/scout';
import { useRecState } from '../lib/useRec';
import { useGame, type Chip } from '../store/game';
import { useNav } from '../store/nav';

export function ScoutChat() {
  const chat = useGame((s) => s.chat);
  const pushChat = useGame((s) => s.pushChat);
  const profile = useGame((s) => s.profile);
  const target = useGame((s) => s.target);
  const rs = useRecState();
  const push = useNav((s) => s.push);
  const setTab = useNav((s) => s.setTab);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chat.length === 0) pushChat({ from: 'scout', text: `Hey ${profile?.name ?? 'there'}! I’m Scout. I know what you’ve told me and what you’ve tried so far, so ask me anything — big questions or tiny ones.` });
  }, [chat.length, profile, pushChat]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.length, typing]);

  const ctx: ScoutCtx = { ...rs, name: profile?.name ?? '', stage: profile?.stage ?? '', age: profile?.age ?? 18, target };
  const send = (t: string) => {
    const msg = t.trim();
    if (!msg || typing) return;
    pushChat({ from: 'me', text: msg });
    setText('');
    setTyping(true);
    const r = scoutReply(msg, ctx);
    window.setTimeout(() => { pushChat({ from: 'scout', text: r.text, chips: r.chips }); setTyping(false); }, 700 + Math.min(1600, r.text.length * 6));
  };
  const chip = (c: Chip) => {
    if (c.kind === 'ask') send(c.text);
    else if (c.kind === 'career') push({ name: 'career', id: c.id });
    else if (c.kind === 'sim') push({ name: 'sim', id: c.id });
    else if (c.kind === 'world') push({ name: 'world', id: c.id });
    else if (c.kind === 'roadmap') { setTab('you'); push({ name: 'roadmap', careerId: c.id }); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-grape-50">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-grape-100 bg-white px-4 py-3">
        <ScoutFace size={40} />
        <div className="flex-1"><div className="font-display text-lg font-semibold leading-tight">Scout</div><div className="text-xs font-bold text-lime-600">Your career companion</div></div>
        <Pill color="#FFF6D6" text="#8A5A00">Simulated AI · prototype</Pill>
      </div>
      <div className="flex-1 space-y-3 px-4 pb-44 pt-4">
        <p className="mx-auto max-w-[300px] text-center text-[11px] font-bold text-ink-400">Scout is a simulated assistant using your profile and activity. It gives suggestions, not verdicts — always talk big decisions through with people you trust.</p>
        {chat.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.from === 'me' ? 'justify-end' : 'items-end gap-2'}`}>
            {m.from === 'scout' && <ScoutFace size={30} />}
            <div className="max-w-[80%]">
              <div className={`whitespace-pre-line rounded-3xl px-4 py-3 text-[15px] font-semibold leading-relaxed ${m.from === 'me' ? 'rounded-br-md bg-grape-500 text-white' : 'rounded-bl-md bg-white text-ink-900 shadow-[0_3px_0_#E4DAF7]'}`}>{m.text}</div>
              {m.chips && <div className="mt-2 flex flex-wrap gap-1.5">{m.chips.map((c) => <button key={c.label} onClick={() => chip(c)} className="rounded-full border-2 border-grape-200 bg-white px-3 py-1.5 text-xs font-extrabold text-grape-600 active:scale-95">{c.label}</button>)}</div>}
            </div>
          </motion.div>
        ))}
        <AnimatePresence>{typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-2"><ScoutFace size={30} />
            <div className="flex gap-1 rounded-3xl rounded-bl-md bg-white px-4 py-4 shadow-[0_3px_0_#E4DAF7]">{[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-grape-300" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}</div>
          </motion.div>
        )}</AnimatePresence>
        {chat.length <= 1 && <div className="flex justify-center pt-2"><Scout size={110} mood="wave" /></div>}
        <div ref={end} />
      </div>
      <div className="fixed bottom-[68px] left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 bg-gradient-to-t from-grape-50 via-grape-50 to-transparent px-3 pb-2 pt-4">
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
          {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-ink-700 shadow-sm">{s}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Scout anything…" aria-label="Message Scout" className="h-12 flex-1 rounded-2xl border-2 border-grape-100 bg-white px-4 font-semibold outline-none focus:border-grape-400" />
          <button type="submit" disabled={!text.trim() || typing} aria-label="Send" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-grape-500 text-white shadow-[0_4px_0_#41188A] disabled:opacity-40"><Icon name="send" /></button>
        </form>
      </div>
    </div>
  );
}
