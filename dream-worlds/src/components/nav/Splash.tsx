"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalmMark } from "../ui/CalmMark";

/** Launch screen, once per session: the wordmark breathes in, then the app fades up. */
export function Splash() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("dw.splash") === "1";
      sessionStorage.setItem("dw.splash", "1");
    } catch {}
    if (seen) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2300);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          onClick={() => setShow(false)}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-night-950"
        >
          <motion.div
            className="absolute h-[60vmin] w-[60vmin] rounded-full bg-[radial-gradient(circle,rgba(184,168,244,0.35),rgba(143,182,255,0.12)_45%,transparent_70%)] blur-2xl"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.05, 0.95], opacity: [0, 1, 0.8] }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />
          <motion.div initial={{ opacity: 0, y: 8, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} className="relative text-center">
            <CalmMark className="text-[56px]" />
            <motion.p initial={{ opacity: 0, letterSpacing: "0.5em" }} animate={{ opacity: 0.85, letterSpacing: "0.32em" }} transition={{ delay: 0.5, duration: 1.2 }} className="mt-3 text-[11px] font-semibold uppercase text-mist-200">
              Dream Worlds
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
