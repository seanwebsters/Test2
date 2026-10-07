"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Moon, Play, UserRound } from "lucide-react";
import { worldById } from "@/lib/data/worlds";
import { WorldArt } from "../art/WorldArt";
import { CalmMark } from "../ui/CalmMark";
import { CastStack } from "../cards/DreamCard";
import type { Dream } from "@/lib/types";

const ROTATION = ["endless-seas", "moonlit-academy", "starlight-armada", "aurora-line"];

export function HomeHero({ featured, name }: { featured: Dream; name: string }) {
  const [i, setI] = useState(0);
  const [greeting, setGreeting] = useState("Good evening");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 5 ? "Still awake" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    const t = setInterval(() => setI((x) => (x + 1) % ROTATION.length), 8000);
    return () => clearInterval(t);
  }, []);
  const world = worldById(ROTATION[i])!;

  return (
    <section className="relative h-[86svh] min-h-[620px] w-full overflow-hidden lg:h-[88vh] lg:min-h-[720px]">
      <AnimatePresence mode="sync">
        <motion.div key={world.id} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2.4, ease: "easeOut" }} className="absolute inset-0">
          <WorldArt scene={world.visualStyle.scene} palette={world.visualStyle.palette} seed={`hero-${world.id}`} detail="hero" className="absolute inset-0 animate-pan" />
        </motion.div>
      </AnimatePresence>
      <div className="grain absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-night-950/70 via-transparent to-night-950" />
      <div className="absolute inset-0 hidden bg-gradient-to-r from-night-950/90 via-night-950/30 to-transparent lg:block" />

      {/* mobile top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),18px)] lg:hidden">
        <div className="flex items-center gap-2.5">
          <CalmMark className="text-[26px]" />
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-mist-200/80">Dream Worlds</span>
        </div>
        <Link href="/you" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 backdrop-blur" aria-label="You">
          <UserRound className="h-4 w-4 text-mist-100" />
        </Link>
      </div>

      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[1480px] flex-col gap-10 px-5 pb-10 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pb-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} className="max-w-2xl">
          <p className="eyebrow mb-4 flex items-center gap-2 text-ember-200/90">
            <Moon className="h-3.5 w-3.5" /> {greeting}, {name}
          </p>
          <h1 className="font-display text-[44px] font-light leading-[1.02] tracking-[-0.02em] text-white sm:text-6xl lg:text-[84px]">
            What would you like to <span className="text-gradient italic">dream</span> tonight?
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-mist-200/90 lg:text-base">
            Pick a world. Pick your characters. AI tells you the story — and it grows quieter as you fall asleep.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/create" className="btn-dream group flex w-full items-center justify-center gap-3 rounded-full px-8 py-4 text-[15px] font-semibold sm:w-auto">
              Create a Dream
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/explore" className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-4 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/10 sm:flex">
              Explore worlds
            </Link>
          </div>
        </motion.div>

        {/* desktop: featured dream billboard */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.3 }} className="hidden w-[380px] lg:block">
          <Link href={`/dream/${featured.id}`} className="glass block rounded-3xl p-5 transition hover:bg-white/[0.07]">
            <p className="eyebrow mb-3">Tonight&apos;s featured dream</p>
            <h3 className="font-display text-2xl font-light leading-tight text-white">{featured.output.dream_title}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-mist-300">{featured.output.hook}</p>
            <div className="mt-5 flex items-center justify-between">
              <CastStack ids={featured.request.characters} size={32} />
              <span className="btn-indigo flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white">
                <Play className="h-3.5 w-3.5 fill-white" /> Preview
              </span>
            </div>
          </Link>
        </motion.div>
      </div>

      <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 gap-1.5 lg:flex">
        {ROTATION.map((r, idx) => (
          <span key={r} className={`h-1 rounded-full transition-all duration-700 ${idx === i ? "w-6 bg-white/80" : "w-1.5 bg-white/25"}`} />
        ))}
      </div>
    </section>
  );
}
