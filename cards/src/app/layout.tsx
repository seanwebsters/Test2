import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/unbounded/500.css";
import "@fontsource/unbounded/700.css";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fredoka";
import "@fontsource/chakra-petch/700-italic.css";
import "@fontsource/limelight";
import "@fontsource/bungee";
import "@fontsource-variable/syne";
import "@fontsource/abril-fatface";
import "@fontsource/vt323";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/yeseva-one";
import "@fontsource/righteous";
import "@fontsource-variable/playfair-display";
import "./globals.css";
import { MobileNav, TopNav } from "@/components/shell/Nav";
import { ViewerProvider } from "@/components/shell/Viewer";
import { loadViewer } from "@/lib/view/viewer";

export const metadata: Metadata = {
  title: { default: "NEXARA — Infinite worlds. One collection.", template: "%s · NEXARA" },
  description: "Discover original fictional universes, collect beautifully designed cards, and follow stories that unlock as you collect.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "NEXARA", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#09090d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { info } = await loadViewer();
  return (
    <html lang="en" data-reduced-motion={String(info.settings.reducedMotion)}>
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-bone focus:px-4 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <ViewerProvider initial={info}>
          <TopNav />
          <main id="main" className="pb-28 xl:pb-16">
            {children}
          </main>
          <MobileNav />
        </ViewerProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator&&location.protocol==='https:'){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`,
          }}
        />
      </body>
    </html>
  );
}
