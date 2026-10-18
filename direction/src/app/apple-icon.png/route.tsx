import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/server/icon-art";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<IconArt size={180} />, { width: 180, height: 180 });
}
