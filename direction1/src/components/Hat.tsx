import type { HatId } from '../data/types';

/** Hats sit on a 120-wide head whose crown is around y=28, centre x=60. */
export function Hat({ id }: { id: HatId }) {
  switch (id) {
    case 'explorer':
      return <g><ellipse cx="60" cy="30" rx="34" ry="7" fill="#C9874A" stroke="#7A4A1E" strokeWidth="2.5" /><path d="M40 30c0-14 9-20 20-20s20 6 20 20Z" fill="#E0A76A" stroke="#7A4A1E" strokeWidth="2.5" /><path d="M41 25h38" stroke="#7ED321" strokeWidth="4" /></g>;
    case 'beret':
      return <g><ellipse cx="56" cy="22" rx="28" ry="11" fill="#FF4F8B" stroke="#B0245C" strokeWidth="2.5" transform="rotate(-10 56 22)" /><circle cx="56" cy="11" r="3" fill="#B0245C" /></g>;
    case 'hardhat':
      return <g><path d="M34 30c0-15 12-22 26-22s26 7 26 22Z" fill="#FFC928" stroke="#C79100" strokeWidth="2.5" /><rect x="28" y="28" width="64" height="6" rx="3" fill="#FFC928" stroke="#C79100" strokeWidth="2.5" /><path d="M60 9v19" stroke="#C79100" strokeWidth="3" /></g>;
    case 'headphones':
      return <g><path d="M24 50c0-26 16-40 36-40s36 14 36 40" fill="none" stroke="#2B2347" strokeWidth="6" strokeLinecap="round" /><rect x="14" y="44" width="16" height="22" rx="7" fill="#FF5A45" stroke="#2B2347" strokeWidth="2.5" /><rect x="90" y="44" width="16" height="22" rx="7" fill="#FF5A45" stroke="#2B2347" strokeWidth="2.5" /></g>;
    case 'goggles':
      return <g><path d="M30 26h60" stroke="#2B2347" strokeWidth="5" strokeLinecap="round" /><circle cx="48" cy="24" r="10" fill="#C4F4EA" stroke="#0B7D6B" strokeWidth="3" /><circle cx="72" cy="24" r="10" fill="#C4F4EA" stroke="#0B7D6B" strokeWidth="3" /><path d="M44 20l4-2M68 20l4-2" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></g>;
    case 'crown':
      return <g><path d="M38 30l4-20 10 10 8-14 8 14 10-10 4 20Z" fill="#FFC928" stroke="#C79100" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="60" cy="23" r="3.5" fill="#FF5A45" /><circle cx="47" cy="25" r="2.5" fill="#3FA2F7" /><circle cx="73" cy="25" r="2.5" fill="#7ED321" /></g>;
    case 'cap':
      return <g><path d="M38 30c0-14 9-20 22-20s22 6 22 20Z" fill="#3FA2F7" stroke="#155FAE" strokeWidth="2.5" /><path d="M78 28c8 0 16 2 18 5H70" fill="#155FAE" stroke="#155FAE" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="60" cy="11" r="3" fill="#155FAE" /></g>;
    case 'chef':
      return <g><path d="M42 30a10 10 0 0 1 2-20 16 16 0 0 1 32 0 10 10 0 0 1 2 20Z" fill="#fff" stroke="#9A95B5" strokeWidth="2.5" /><rect x="42" y="26" width="36" height="8" rx="2" fill="#fff" stroke="#9A95B5" strokeWidth="2.5" /></g>;
    case 'flower':
      return <g>{[36, 48, 60, 72, 84].map((x, i) => <g key={x}><circle cx={x} cy={i % 2 ? 22 : 26} r="6" fill={['#FF5C93', '#FFC928', '#8C4DFF', '#7ED321', '#3FA2F7'][i]} /><circle cx={x} cy={i % 2 ? 22 : 26} r="2.2" fill="#fff" /></g>)}</g>;
    case 'wizard':
      return <g><path d="M36 32L62 -6l22 38Z" fill="#5620B5" stroke="#2B0F5E" strokeWidth="2.5" strokeLinejoin="round" /><ellipse cx="60" cy="32" rx="30" ry="6" fill="#5620B5" stroke="#2B0F5E" strokeWidth="2.5" /><path d="M56 12l2 4 4 1-4 1-2 4-1-4-4-1 4-1Z" fill="#FFC928" /><circle cx="68" cy="22" r="2" fill="#FFC928" /></g>;
    case 'headband':
      return <g><path d="M30 34c10-6 50-6 60 0" fill="none" stroke="#FF5A45" strokeWidth="8" strokeLinecap="round" /><path d="M30 34c10-6 50-6 60 0" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 6" /></g>;
    case 'grad':
      return <g><path d="M60 6l34 12-34 12-34-12Z" fill="#2B2347" /><path d="M44 22v8c8 5 24 5 32 0v-8" fill="#2B2347" /><path d="M92 18v14" stroke="#FFC928" strokeWidth="2.5" /><circle cx="92" cy="33" r="3" fill="#FFC928" /></g>;
    case 'party':
      return <g><path d="M46 30L60 -2l14 32Z" fill="#7ED321" stroke="#478A06" strokeWidth="2.5" strokeLinejoin="round" /><path d="M52 16h16M49 24h22" stroke="#FFC928" strokeWidth="3.5" /><circle cx="60" cy="-2" r="4.5" fill="#FF5C93" /></g>;
    default:
      return null;
  }
}
