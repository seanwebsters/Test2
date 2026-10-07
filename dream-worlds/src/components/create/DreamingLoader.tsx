"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { worldById } from "@/lib/data/worlds";
import { characterById } from "@/lib/data/characters";
import { WorldArt } from "../art/WorldArt";

export function DreamingLoader({ worldIds, characterIds }: { worldIds: string[]; characterIds: string[] }) {
  const w = worldById(worldIds[0] ?? "endless-seas")!;
  const chars = characterIds.map(characterById).filter(Boolean);
  const lines = [
    `Reading the lore of ${worldIds.map((id) => worldById(id)!.title).join(" and ")}…`,
    `Listening for ${chars[0]?.name ?? "your characters"}'s voice…`,
    "Checking with the rights holders…",
    "Weaving your story…",
    "Shaping the sleep curve…",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, lines.length - 1)), 900);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-night-950">
      <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 0.55, scale: 1 }} transition={{ duration: 3 }} className="absolute inset-0">
        <WorldArt scene={w.visualStyle.scene} palette={w.visualStyle.palette} seed="loader" detail="hero" className="absolute inset-0 blur-sm" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-night-950/70 via-night-950/40 to-night-950" />
      <div className="relative flex flex-col items-center px-8 text-center">
        <div className="relative h-36 w-36">
          {[0, 1, 2].map((k) => (
            <motion.span
              key={k}
              className="absolute inset-0 rounded-full border border-white/20"
              animate={{ scale: [0.6, 1.5], opacity: [0.7, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, delay: k * 1.2, ease: "easeOut" }}
            />
          ))}
          <motion.span className="absolute inset-8 rounded-full bg-gradient-to-br from-ember-200 via-dusk-400 to-glow-400 blur-md" animate={{ scale: [0.9, 1.05, 0.9] }} transition={{ duration: 4, repeat: Infinity }} />
          <span className="absolute inset-10 rounded-full bg-gradient-to-br from-ember-200 via-dusk-400 to-glow-400" />
        </div>
        <p className="eyebrow mt-10">Dream Engine</p>
        <h2 className="mt-3 font-display text-3xl font-light text-white">Dreaming it up</h2>
        <div className="mt-3 h-6">
          <AnimatePresence mode="wait">
            <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-sm text-mist-300">
              {lines[i]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
