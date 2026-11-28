import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Button, Header } from '../components/ui';
import { DEMO_PARTNERS } from '../data/partners';
import { useGame } from '../store/game';
import { useNav } from '../store/nav';

export function Settings() {
  const s = useGame();
  const reset = useNav((n) => n.reset);
  const push = useNav((n) => n.push);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const partner = DEMO_PARTNERS.find((p) => p.code === s.partner);
  const Toggle = ({ on, set, label, sub }: { on: boolean; set: (v: boolean) => void; label: string; sub: string }) => (
    <button onClick={() => set(!on)} role="switch" aria-checked={on} className="flex w-full items-center gap-3 rounded-2xl bg-cloud p-3 text-left">
      <div className="flex-1"><div className="font-extrabold">{label}</div><div className="text-xs font-semibold text-ink-500">{sub}</div></div>
      <span className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${on ? 'bg-lime-500' : 'bg-ink-300'}`}><span className={`h-5 w-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} /></span>
    </button>
  );
  return (
    <div className="min-h-screen bg-white pb-10">
      <Header title="Settings" />
      <div className="space-y-3 px-4">
        <Toggle on={s.voice} set={s.setVoice} label="Read stories aloud" sub="Uses your browser’s built-in voice when available" />
        <Toggle on={s.reducedMotion} set={s.setReducedMotion} label="Reduce motion" sub="Turns off confetti and bouncing animations" />
        <button onClick={() => push({ name: 'plus' })} className="flex w-full items-center gap-3 rounded-2xl bg-cloud p-3 text-left"><Icon name="crown" className="text-sun-500" /><span className="flex-1 font-extrabold">Direction Plus</span><span className="text-sm font-bold text-ink-500">{s.plus ? 'Active' : 'Free plan'}</span></button>

        <div className="rounded-2xl border-2 border-grape-50 p-4">
          <div className="font-display font-semibold">School, college or employer code</div>
          <p className="text-xs font-semibold text-ink-500">Partners can feature opportunities and provide Plus. Try the sample code <b>DEMO-SCHOOL</b>.</p>
          {partner ? <p className="mt-2 font-bold text-lime-700">Connected to {partner.name}</p> : (
            <form onSubmit={(e) => { e.preventDefault(); setMsg(s.joinPartner(code) ? 'Connected!' : 'That code wasn’t recognised.'); }} className="mt-2 flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" aria-label="Partner code" className="h-11 flex-1 rounded-xl border-2 border-grape-100 px-3 font-bold uppercase outline-none focus:border-grape-400" />
              <Button size="sm" type="submit" className="h-11">Join</Button>
            </form>
          )}
          {msg && !partner && <p className="mt-1 text-sm font-bold text-coral-500">{msg}</p>}
        </div>

        <div className="rounded-2xl bg-cloud p-4 text-sm font-semibold text-ink-500">
          <div className="font-display text-base font-semibold text-ink-900">About this prototype</div>
          <p className="mt-1">Your progress is stored only in this browser (local storage). Salary figures are illustrative. Stories are original fiction. Scout is a simulated assistant, not a live AI. Nothing here is a definitive judgement about your potential.</p>
        </div>

        {confirm ? (
          <div className="rounded-2xl border-2 border-coral-300 bg-coral-100 p-4">
            <p className="font-bold">Start over? This deletes your profile and progress on this device.</p>
            <div className="mt-3 flex gap-2"><Button tone="white" className="flex-1" onClick={() => setConfirm(false)}>Keep it</Button><Button tone="coral" className="flex-1" onClick={() => { s.resetAll(); reset(); }}>Reset</Button></div>
          </div>
        ) : <Button tone="white" full onClick={() => setConfirm(true)}><Icon name="refresh" size={18} />Start over</Button>}
      </div>
    </div>
  );
}
