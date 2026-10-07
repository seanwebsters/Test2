import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { DreamStoreProvider } from "@/lib/store";
import { AppShell } from "@/components/nav/AppShell";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["SOFT", "opsz"], display: "swap" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Dream Worlds · Calm",
  description: "Pick a world. Pick your characters. AI tells you the story — built for sleep.",
  applicationName: "Dream Worlds",
  appleWebApp: { capable: true, title: "Dream Worlds", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#04060f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <head>
        {/* When running inside the /device presenter frame, emulate iPhone safe areas. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(window.self!==window.top){var r=document.documentElement.style;r.setProperty('--safe-top','54px');r.setProperty('--safe-bottom','30px');document.documentElement.dataset.framed='1'}}catch(e){}`,
          }}
        />
      </head>
      <body className="font-sans">
        <DreamStoreProvider>
          <AppShell>{children}</AppShell>
        </DreamStoreProvider>
      </body>
    </html>
  );
}
