"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import Mascot from "./Mascot";
import Celebrations from "./Celebrations";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const onboarded = useStore((s) => s.onboarded);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const done = () => setHydrated(true);
    const unsub = useStore.persist.onFinishHydration(done);
    useStore.persist.rehydrate();
    if (useStore.persist.hasHydrated()) done();
    return unsub;
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const publicPaths = ["/welcome", "/business"];
  const needsOnboarding = hydrated && !onboarded && !publicPaths.some((p) => pathname.startsWith(p));
  useEffect(() => {
    if (needsOnboarding) router.replace("/welcome");
    else if (hydrated && onboarded && pathname === "/") router.replace("/learn");
  }, [needsOnboarding, hydrated, onboarded, pathname, router]);

  const showSplash = !hydrated || needsOnboarding || (onboarded && pathname === "/");

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col app-frame relative">
      {showSplash ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gradient-to-b from-grape-500 to-grape-700">
          <Mascot size={120} wave bare />
          <div className="font-display text-3xl font-semibold text-white">AIBI</div>
        </div>
      ) : (
        <>
          {children}
          {!["/lesson", "/welcome", "/challenge/", "/plus"].some((x) => pathname.startsWith(x)) && pathname !== "/challenge" && <Celebrations />}
        </>
      )}
    </div>
  );
}
