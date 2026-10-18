import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { CelebrationProvider } from "@/components/app/Celebrate";
import { ServiceWorker } from "@/components/app/ServiceWorker";

export const metadata: Metadata = {
  title: { default: "DIRECTION — Find your path. Build your future.", template: "%s · DIRECTION" },
  description: "Discover careers you'll love, then build them one daily mission at a time — with an AI coach in your pocket.",
  applicationName: "DIRECTION",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "DIRECTION", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#091026" },
  ],
};

const themeScript = `try{var t=localStorage.getItem('direction-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">
          Skip to content
        </a>
        <CelebrationProvider>{children}</CelebrationProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
