import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export function AppIcon({ px }: { px: number }) {
  return (
    <div style={{ width: px, height: px, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 30% 20%, #3a2f7a 0%, #0e1530 55%, #04060f 100%)" }}>
      <div style={{ width: px * 0.46, height: px * 0.46, borderRadius: "50%", boxShadow: `${px * 0.09}px ${-px * 0.05}px 0 0 #f6e2b8`, transform: `translate(${-px * 0.05}px, ${px * 0.03}px)` }} />
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(<AppIcon px={512} />, size);
}
