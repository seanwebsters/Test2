import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource-variable/inter";
import "./globals.css";
import { getViewer, toPublicViewer } from "@/lib/auth";
import { DEMO_PERSONAS } from "@/lib/auth/personas";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PlayerProvider, type PlayerPrefs } from "@/components/player/PlayerProvider";
import { MiniPlayer } from "@/components/player/MiniPlayer";

export const metadata: Metadata = {
  title: { default: "Calm Stories — Immersive Sleep Stories", template: "%s · Calm Stories" },
  description: "Original serialized Sleep Stories, new episodes and peaceful worlds. All included with Calm Premium.",
};

export const viewport: Viewport = { themeColor: "#07152E", width: "device-width", initialScale: 1 };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const settings = viewer.user ? await getDb().get("user_settings", viewer.user.id) : null;
  const prefs: PlayerPrefs = {
    autoplayNext: settings?.autoplay_next ?? true,
    autoplayLimit: settings?.autoplay_limit ?? 3,
    defaultSpeed: settings?.default_speed ?? 1,
    defaultSleepMinutes: settings?.default_sleep_timer_minutes ?? null,
  };
  return (
    <html lang="en-GB">
      <body>
        <a href="#main" className="sr-only z-50 rounded-full bg-white px-4 py-2 text-night focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <PlayerProvider prefs={prefs} key={viewer.user?.id ?? "visitor"}>
          <Nav viewer={toPublicViewer(viewer)} personas={DEMO_PERSONAS} demoAuth={env.authProvider === "demo"} />
          <main id="main" className="pb-32">
            {children}
          </main>
          <Footer />
          <MiniPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
