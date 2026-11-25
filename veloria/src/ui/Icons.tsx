/** Hand-drawn line icons for the interface. */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function IconExplore() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26">
      <path {...P} d="M6 15 L16 7 L26 15" />
      <path {...P} d="M8.5 13.5 V25 H23.5 V13.5" />
      <path {...P} d="M14 25 V19.5 C14 17.5 18 17.5 18 19.5 V25" />
      <path {...P} d="M21 9.5 V6.5 H23 V11" />
    </svg>
  );
}
export function IconMerge() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26">
      <path {...P} d="M16 5 L18.2 12.2 L25.5 12.4 L19.6 16.8 L21.8 24 L16 19.6 L10.2 24 L12.4 16.8 L6.5 12.4 L13.8 12.2Z" />
      <circle cx="16" cy="15" r="1.4" fill="currentColor" />
    </svg>
  );
}
export function IconStory() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26">
      <path {...P} d="M16 9 C12 6.5 8 6.5 4.5 8 V24 C8 22.5 12 22.5 16 25 C20 22.5 24 22.5 27.5 24 V8 C24 6.5 20 6.5 16 9Z" />
      <path {...P} d="M16 9 V25" />
      <path {...P} d="M8 12 C10 11.5 12 11.6 13 12.2 M8 15.5 C10 15 12 15.1 13 15.7" opacity="0.6" />
    </svg>
  );
}
export function IconLove() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26">
      <path {...P} d="M16 26 C9 21 5 17 5 12.5 C5 9 7.6 6.8 10.5 6.8 C13 6.8 15 8.4 16 10.3 C17 8.4 19 6.8 21.5 6.8 C24.4 6.8 27 9 27 12.5 C27 17 23 21 16 26Z" />
    </svg>
  );
}
export function IconSatchel() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26">
      <path {...P} d="M7 12 H25 L23.5 25.5 C23.4 26.4 22.6 27 21.7 27 H10.3 C9.4 27 8.6 26.4 8.5 25.5Z" />
      <path {...P} d="M11.5 12 C11.5 6.5 20.5 6.5 20.5 12" />
      <path {...P} d="M7 15.5 C11 18.5 21 18.5 25 15.5" />
      <rect x="14.5" y="17" width="3" height="3.4" rx="0.8" {...P} />
    </svg>
  );
}
export function IconEnergy() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M13.5 2.5 L5.5 13.5 H11 L9.8 21.5 L18.5 9.8 H12.8Z" fill="#f2c96b" stroke="#8a6a3a" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}
export function IconDew() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path d="M12 3 C15 8 18.5 11 18.5 14.5 C18.5 18.2 15.6 21 12 21 C8.4 21 5.5 18.2 5.5 14.5 C5.5 11 9 8 12 3Z" fill="#b9a6e8" stroke="#5f4a96" strokeWidth="1.1" />
      <path d="M9 14 C9 12.5 10 11.5 11 11" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
export function IconHeart({ filled = true, size = 18 }: { filled?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path
        d="M12 20.5 C6.5 16.6 3.5 13.5 3.5 9.8 C3.5 7 5.6 5 8 5 C9.9 5 11.3 6.1 12 7.6 C12.7 6.1 14.1 5 16 5 C18.4 5 20.5 7 20.5 9.8 C20.5 13.5 17.5 16.6 12 20.5Z"
        fill={filled ? '#d9728a' : 'none'}
        stroke="#8a3c52"
        strokeWidth="1.2"
      />
      {filled && <path d="M7.2 9 C7.4 7.8 8.2 7.1 9.2 7" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />}
    </svg>
  );
}
export function IconLock() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <rect x="5.5" y="10.5" width="13" height="10" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 10.5 V8 C8.5 5.8 10 4.5 12 4.5 C14 4.5 15.5 5.8 15.5 8 V10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="15.2" r="1.3" fill="currentColor" />
    </svg>
  );
}
export function IconClose() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
export function IconBack() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M14.5 5.5 L8 12 L14.5 18.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function IconNext() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M9.5 5.5 L16 12 L9.5 18.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function IconSound({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M4.5 9.5 H8 L12.5 5.5 V18.5 L8 14.5 H4.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {on ? (
        <path d="M15.5 9 C16.8 10.5 16.8 13.5 15.5 15 M18 6.8 C20.6 9.6 20.6 14.4 18 17.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <path d="M15.5 9.5 L20 14 M20 9.5 L15.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}
export function IconEnvelope({ sealed = true }: { sealed?: boolean }) {
  return (
    <svg viewBox="0 0 48 36" width="48" height="36">
      <rect x="2" y="3" width="44" height="30" rx="3" fill="#fbf3e4" stroke="#6b5274" strokeWidth="1.4" />
      <path d="M2.5 5 L24 21 L45.5 5" fill="none" stroke="#6b5274" strokeWidth="1.3" />
      {sealed && <circle cx="24" cy="20" r="5.5" fill="#b8566c" stroke="#6b3a4c" strokeWidth="1" />}
    </svg>
  );
}
export function Crescent({ size = 28, color = '#f3e3c3' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <path d="M20 3 C12 4 6.5 10 6.5 17 C6.5 24.5 12.5 29.5 19.5 29.5 C23.5 29.5 26.5 28 28.5 25.5 C18 27 11 19 14.5 10 C15.8 6.7 17.8 4.6 20 3Z" fill={color} />
      <path d="M25 6 L25.8 8.2 L28 9 L25.8 9.8 L25 12 L24.2 9.8 L22 9 L24.2 8.2Z" fill={color} />
    </svg>
  );
}
export function Sprig({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 80 24" width="80" height="24" style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
      <path d="M78 12 C60 12 40 10 6 13" stroke="#8aa082" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {[14, 26, 38, 50, 62].map((x, i) => (
        <g key={x}>
          <path d={`M${x} ${12} C${x - 4} ${4} ${x + 4} ${3} ${x + 6} ${6} C${x + 4} ${9} ${x + 1} ${11} ${x} ${12}Z`} fill={i % 2 ? '#a9bea0' : '#93ab8c'} />
          <path d={`M${x + 4} ${12} C${x} ${19} ${x + 8} ${21} ${x + 10} ${18} C${x + 8} ${15} ${x + 5} ${13} ${x + 4} ${12}Z`} fill={i % 2 ? '#93ab8c' : '#a9bea0'} />
        </g>
      ))}
      <circle cx="8" cy="12.5" r="3" fill="#e7a7b3" />
      <circle cx="8" cy="12.5" r="1.1" fill="#f6e3b4" />
    </svg>
  );
}
