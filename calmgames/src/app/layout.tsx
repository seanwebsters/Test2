import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: { default: "Calm Game Studio", template: "%s · Calm Game Studio" },
  description: "An autonomous creative studio where specialised AI agents invent, design, build and test calming games.",
};

export const viewport: Viewport = { themeColor: "#F7F3EC" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
