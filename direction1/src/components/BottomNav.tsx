import { motion } from 'framer-motion';
import { useNav, type Tab } from '../store/nav';
import { Icon, type IconName } from './Icon';
import { ScoutFace } from './Scout';

const TABS: { id: Tab; label: string; icon: IconName | 'scout'; color: string }[] = [
  { id: 'journey', label: 'Journey', icon: 'journey', color: '#7C3AED' },
  { id: 'explore', label: 'Explore', icon: 'explore', color: '#1CA0F2' },
  { id: 'play', label: 'Play', icon: 'play', color: '#5FAE0E' },
  { id: 'scout', label: 'Scout', icon: 'scout', color: '#7C3AED' },
  { id: 'you', label: 'You', icon: 'you', color: '#FF5A45' },
];

export function BottomNav() {
  const tab = useNav((s) => s.tab);
  const setTab = useNav((s) => s.setTab);
  return (
    <nav className="safe-bottom fixed bottom-0 left-1/2 z-40 w-full max-w-[440px] -translate-x-1/2 border-t-2 border-grape-50 bg-white/95 backdrop-blur" aria-label="Main">
      <ul className="flex justify-around px-1 pt-1.5">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <li key={t.id} className="flex-1">
              <button onClick={() => setTab(t.id)} aria-current={on ? 'page' : undefined}
                className="relative mx-auto flex w-full flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-extrabold"
                style={{ color: on ? t.color : '#8A84A3' }}>
                {on && <motion.span layoutId="navpill" className="absolute inset-x-2 inset-y-0 rounded-2xl border-2" style={{ borderColor: t.color + '33', background: t.color + '12' }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <span className="relative">{t.icon === 'scout' ? <span className={on ? '' : 'opacity-60 grayscale'}><ScoutFace size={26} /></span> : <Icon name={t.icon} size={26} />}</span>
                <span className="relative">{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
