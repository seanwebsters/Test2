"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Gift, Headphones, Pause, Sparkles } from "lucide-react";
import { useViewer } from "@/components/shell/Viewer";
import { ShardIcon } from "@/components/ui/Currency";
import { btn } from "@/components/ui/styles";
import { ApiError, post, track } from "@/lib/view/client-api";

export function Reader({
  episodeId,
  universeId,
  universeSlug,
  title,
  body,
  font,
  ink,
  accent,
  completed: completed0,
  rewardAvailable: reward0,
  shardReward,
  nextHref,
  cliffhanger,
}: {
  episodeId: string;
  universeId: string;
  universeSlug: string;
  title: string;
  body: string[];
  font: string;
  ink: string;
  accent: string;
  completed: boolean;
  rewardAvailable: boolean;
  shardReward: number;
  nextHref?: string;
  cliffhanger?: string;
}) {
  const { setWallet } = useViewer();
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(completed0);
  const [reward, setReward] = useState(reward0);
  const [justFinished, setJustFinished] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [error, setError] = useState<string>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
    post("/api/story/start", { episodeId }).catch(() => undefined);
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setProgress(Math.min(1, Math.max(0, (window.innerHeight - r.top) / (r.height + window.innerHeight * 0.2))));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.speechSynthesis?.cancel();
    };
  }, [episodeId]);

  const listen = () => {
    const s = window.speechSynthesis;
    if (speaking) {
      s.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance([title, ...body].join("\n\n"));
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    s.speak(u);
    setSpeaking(true);
    track("audio_played", universeId, { episodeId });
  };

  const finish = async () => {
    setError(undefined);
    try {
      const r = await post<{ result: { first: boolean }; wallet: never }>("/api/story/complete", { episodeId });
      setCompleted(true);
      if (r.result.first) {
        setReward(true);
        setJustFinished(true);
      }
      setWallet(r.wallet);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save your progress");
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 top-16 z-30 h-0.5 bg-white/5" aria-hidden>
        <div className="h-full transition-[width]" style={{ width: `${progress * 100}%`, background: accent }} />
      </div>
      {canSpeak && (
        <button onClick={listen} className={`${btn("glass", "sm")} mb-8`} aria-pressed={speaking}>
          {speaking ? <Pause size={15} /> : <Headphones size={15} />} {speaking ? "Stop narration" : "Listen (device narration)"}
        </button>
      )}
      <div ref={ref} className="space-y-6 text-[19px] leading-[1.75] md:text-[21px]" style={{ color: `${ink}e6` }}>
        {body.map((p, i) => (
          <p key={i}>
            {i === 0 ? (
              <>
                <span className={`ff-${font} float-left mr-3 mt-1 text-[64px] leading-[0.8]`} style={{ color: accent }} aria-hidden>{p[0]}</span>
                <span className="sr-only">{p[0]}</span>
                {p.slice(1)}
              </>
            ) : (
              p
            )}
          </p>
        ))}
      </div>
      {cliffhanger && <p className="mt-10 border-l-2 pl-4 text-lg italic" style={{ borderColor: accent, color: ink }}>{cliffhanger}</p>}
      <div className="mt-14 rounded-3xl border border-white/10 bg-ink-2 p-6 text-center">
        {!completed ? (
          <>
            <p className="text-lg font-bold">Finished reading?</p>
            <p className="mt-1 text-sm text-bone-3">Mark it complete to earn <ShardIcon className="inline" /> {shardReward} Shards and a free Episode Pack of this chapter's cards.</p>
            <button onClick={finish} className={`${btn("primary", "lg")} mt-5`}><Check size={18} /> Finish episode</button>
          </>
        ) : (
          <>
            <p className="flex items-center justify-center gap-2 text-lg font-bold">
              <Sparkles size={18} style={{ color: accent }} /> {justFinished ? `Episode complete · +${shardReward} Shards` : "You've read this episode"}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href={`/packs/episode?episode=${episodeId}`} className={btn(reward ? "primary" : "glass", "lg")}>
                <Gift size={18} /> {reward ? "Open your free Episode Pack" : "Open another Episode Pack"}
              </Link>
              {nextHref && <Link href={nextHref} className={btn("light", "lg")}>Next episode</Link>}
              {!nextHref && <Link href={`/universes/${universeSlug}/stories`} className={btn("glass", "lg")}>All episodes</Link>}
            </div>
          </>
        )}
        {error && <p className="mt-3 text-sm text-red-300" role="alert">{error}</p>}
      </div>
    </>
  );
}

export function UnlockButton({ episodeId, cost }: { episodeId: string; cost: number }) {
  const router = useRouter();
  const { setWallet } = useViewer();
  const [error, setError] = useState<string>();
  return (
    <div>
      <button
        className={btn("primary", "lg")}
        onClick={async () => {
          try {
            const r = await post<{ wallet: never }>("/api/story/unlock", { episodeId });
            setWallet(r.wallet);
            router.refresh();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : "Couldn't unlock");
          }
        }}
      >
        Unlock for <ShardIcon /> {cost}
      </button>
      {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
    </div>
  );
}
