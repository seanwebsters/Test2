import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/unbounded";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { SERIES } from "@/lib/catalog";
import { CatalogProvider } from "@/components/providers/CatalogProvider";
import { AppStateProvider } from "@/components/providers/AppState";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { Shell } from "@/components/shell/Shell";
import { CheckoutProvider } from "@/components/billing/Checkout";

export const metadata: Metadata = {
  title: { default: "KNOWHOW — Get interesting.", template: "%s · KNOWHOW" },
  description: "Binge-worthy audio series that happen to make you smarter. History, money, minds, space and more — in episodes you'll actually finish.",
  applicationName: "KNOWHOW",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "KNOWHOW" },
};

export const viewport: Viewport = {
  themeColor: "#111114",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CatalogProvider series={SERIES}>
          <AppStateProvider>
            <PlayerProvider>
              <CheckoutProvider>
                <Shell>{children}</Shell>
              </CheckoutProvider>
            </PlayerProvider>
          </AppStateProvider>
        </CatalogProvider>
      </body>
    </html>
  );
}
