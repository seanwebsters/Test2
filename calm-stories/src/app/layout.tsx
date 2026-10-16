import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource-variable/inter";
import "./globals.css";
import { getViewer } from "@/lib/auth/session";
import { toViewerInfo } from "@/lib/viewer-info";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { PlayerBar } from "@/components/player/PlayerBar";
import { getDb } from "@/lib/db";
import { ListenerChrome } from "@/components/layout/ListenerChrome";

export const metadata: Metadata = {
  title: { default: "Calm Stories — Immersive Sleep Stories", template: "%s · Calm Stories" },
  description: "Original serialized Sleep Stories. New episodes. Peaceful worlds. All included with Calm Premium.",
};

export const viewport: Viewport = { themeColor: "#07152E", width: "device-width", initialScale: 1 };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const info = toViewerInfo(viewer);
  const db = getDb();
  const [settings, unread] = viewer.user
    ? await Promise.all([db.get("user_settings", viewer.user.id), db.count("notifications", { user_id: viewer.user.id, read: false })])
    : [null, 0];
  return (
    <html lang="en">
      <body>
        <PlayerProvider
          signedIn={info.signedIn}
          settings={{
            autoplay_next: settings?.autoplay_next ?? true,
            autoplay_limit: settings?.autoplay_limit ?? 3,
            default_speed: settings?.default_speed ?? 1,
          }}
        >
          <ListenerChrome>
            <SiteHeader viewer={info} unread={unread} />
          </ListenerChrome>
          <main id="main" className="min-h-screen">
            {children}
          </main>
          <ListenerChrome>
            <SiteFooter />
            <PlayerBar />
          </ListenerChrome>
        </PlayerProvider>
      </body>
    </html>
  );
}
