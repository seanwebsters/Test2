import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "@fontsource-variable/fredoka";
import "./globals.css";
import Providers from "@/components/Providers";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "AIBI — Learn AI. A little every day.",
  description: "The fun, friendly way for everyone to learn how to use AI. Five-minute interactive lessons, daily challenges and an AI playground.",
  applicationName: "AIBI",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "AIBI", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "AIBI — Learn AI. A little every day.",
    description: "The fun, friendly way for everyone to learn how to use AI.",
    images: ["/icons/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#7C4DFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="app-backdrop">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
