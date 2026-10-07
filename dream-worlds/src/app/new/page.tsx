"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { NewThisWeek } from "@/components/home/NewThisWeek";

export default function NewPage() {
  return (
    <div className="pt-[max(var(--safe-top),18px)] lg:pt-24">
      <div className="mx-auto max-w-[1480px] px-5 pb-6 lg:px-10">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
      <NewThisWeek />
      <div className="mx-auto mt-10 max-w-[1480px] px-5 lg:px-10">
        <div className="glass rounded-3xl p-6 lg:p-8">
          <p className="eyebrow mb-2 text-ember-200/90">Coming next week</p>
          <p className="font-display text-2xl font-light text-white lg:text-3xl">The Crystal Isles · Desert Caravan · 5 new characters</p>
          <p className="mt-2 text-sm text-mist-300">New worlds and characters arrive every week — from Calm Studios, creators and licensed partners.</p>
          <Link href="/explore" className="btn-indigo mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white">
            Explore This Week <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
