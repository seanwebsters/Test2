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
};

export const viewport: Viewport = {
  themeColor: "#04060f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans">
        <DreamStoreProvider>
          <AppShell>{children}</AppShell>
        </DreamStoreProvider>
      </body>
    </html>
  );
}
