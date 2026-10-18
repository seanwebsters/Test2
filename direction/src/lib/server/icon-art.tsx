export function IconArt({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, background: "#0EAA9C", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32">
        <path d="M16 3 L21 16 L16 29 L11 16 Z" fill="#FFFFFF" />
        <path d="M16 16 L21 16 L16 29 L11 16 Z" fill="#FF7A68" />
        <circle cx="16" cy="16" r="2.2" fill="#0E1B3D" />
      </svg>
    </div>
  );
}
