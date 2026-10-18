import Link from "next/link";
import { ArrowRight, Compass, MessageCircle, Route, Sparkles, Target } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Pip } from "@/components/brand/Pip";
import { CareerArt } from "@/components/career/CareerArt";
import { CAREERS } from "@/lib/content/careers";
import { DemoButton } from "./DemoButton";

const FLOATERS = ["creative-director", "software-engineer", "music-producer", "doctor", "entrepreneur", "fashion-designer"];

export function Landing() {
  const careers = FLOATERS.map((s) => CAREERS.find((c) => c.slug === s)!);
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Link href="/signin" className="btn-ghost btn-sm">
          Sign in
        </Link>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-[1.1fr_1fr] md:pt-14">
          <div className="animate-fade-up">
            <div className="eyebrow mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-coral" /> Find your path. Build your future.
            </div>
            <h1 className="h-display text-[clamp(2.6rem,7vw,4.6rem)] leading-[0.95] text-balance">
              Not sure what you want to do?
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-2">
              That&apos;s okay. Let&apos;s figure it out together — in about five minutes. Then build it, one small mission a day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/onboarding" className="btn-primary text-base">
                Find my direction <ArrowRight size={18} />
              </Link>
              <DemoButton />
            </div>
            <p className="mt-4 text-xs text-ink-3">Free to start. No CV needed. Match percentages are for exploring, not a test.</p>
          </div>

          <div className="relative mx-auto h-[420px] w-full max-w-md">
            <div className="absolute inset-6 rounded-[3rem] bg-gradient-to-br from-mint-soft via-lavender-soft to-coral-soft" />
            {careers.map((c, i) => {
              const pos = [
                "left-0 top-6 -rotate-6",
                "right-0 top-0 rotate-6",
                "left-4 bottom-16 rotate-3",
                "right-2 bottom-8 -rotate-3",
                "left-[30%] -top-2 rotate-2 hidden sm:block",
                "left-[28%] bottom-0 -rotate-2 hidden sm:block",
              ][i];
              return (
                <div key={c.slug} className={`absolute w-40 animate-float ${pos}`} style={{ animationDelay: `${i * 0.6}s` }}>
                  <div className="card overflow-hidden p-1.5">
                    <CareerArt slug={c.slug} category={c.category} className="h-20" showEmoji={false} />
                    <div className="px-2 py-2">
                      <div className="truncate font-display text-sm font-bold">{c.title}</div>
                      <div className="text-xs font-bold text-teal">{92 - i * 4}% match</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Pip mood="wave" size={150} />
            </div>
          </div>
        </section>

        <section className="bg-surface-2/60 py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="h-display text-3xl text-balance md:text-4xl">Duolingo made languages feel doable. We do that for careers.</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {[
                { icon: Compass, t: "Discover", d: "Swipe, play and answer quick questions. Get your top three directions — explained in your own words." },
                { icon: Route, t: "Follow a path", d: "Every career becomes a 10-level map. Levels unlock when you prove progress, not just collect points." },
                { icon: Target, t: "Daily missions", d: "Three to five real, bite-sized activities a day. Research, create, connect — and keep the streak." },
                { icon: MessageCircle, t: "A coach in your pocket", d: "Pip knows your goals and progress, and helps with missions, CVs, interviews and big decisions." },
              ].map((f) => (
                <div key={f.t} className="card p-5">
                  <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-teal-soft text-teal-deep dark:text-teal">
                    <f.icon size={22} />
                  </div>
                  <h3 className="h-display text-lg">{f.t}</h3>
                  <p className="mt-1 text-sm text-ink-2">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 text-center">
          <Pip mood="excited" size={96} className="mx-auto" />
          <h2 className="h-display mt-4 text-3xl text-balance">120+ careers. Three fully playable paths. One you.</h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-2">Creative Director, Entrepreneur and Software Engineer come with hand-crafted 10-level journeys — and every other career has a starter path you can play today.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/onboarding" className="btn-primary text-base">
              Start in 5 minutes
            </Link>
            <Link href="/discover" className="btn-ghost">
              Browse careers
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-xs text-ink-3">
        <p>DIRECTION · Find your path. Build your future.</p>
        <p className="mt-1">
          <Link href="/privacy" className="underline">
            Privacy
          </Link>{" "}
          · We never sell your data.
        </p>
      </footer>
    </div>
  );
}
