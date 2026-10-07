"use client";

import { useEffect, useState } from "react";

/** iOS-style: the large title scrolls away and a compact, blurred title bar fades in. */
export function CompactHeader({ title, threshold = 64, right }: { title: string; threshold?: number; right?: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return (
    <div
      aria-hidden={!show}
      className={`pt-safe fixed inset-x-0 top-0 z-30 border-b bg-night-950/75 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 lg:hidden ${show ? "border-white/[0.07] opacity-100" : "pointer-events-none border-transparent opacity-0"}`}
    >
      <div className="relative flex h-11 items-center justify-center px-5">
        <p className="text-[15px] font-semibold text-white">{title}</p>
        {right && <div className="absolute right-4">{right}</div>}
      </div>
    </div>
  );
}
