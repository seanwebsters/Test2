"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Mascot from "@/components/Mascot";
import { Button, Progress } from "@/components/ui";
import { IconArrowLeft, IconDownload, IconShare } from "@/components/icons";
import { SKILL_LABELS, getWorld } from "@/content/curriculum";
import { hashString } from "@/lib/date";
import { worldAccuracy, worldComplete, worldProgress } from "@/lib/gamification";
import { renderCertificate, shareBlob } from "@/lib/share";
import { useStore } from "@/lib/store";

export default function CertificatePage() {
  const { worldId } = useParams<{ worldId: string }>();
  const router = useRouter();
  const s = useStore();
  const world = getWorld(worldId);
  const [busy, setBusy] = useState<"" | "share" | "download">("");
  if (!world) return null;
  const done = worldComplete(s, world.id);
  const name = s.profile?.name ?? "Learner";
  const score = Math.round(worldAccuracy(s, world.id) * 100);
  const last = world.lessons.map((l) => s.completed[l.id]?.at).filter(Boolean).sort().pop();
  const date = last ? new Date(last).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const skills = Array.from(new Set(world.lessons.map((l) => SKILL_LABELS[l.skill].label))).slice(0, 4);
  const id = `AIBI-${world.n}-${(hashString(name + world.id + (last ?? "")) % 1e8).toString(36).toUpperCase()}`;
  const title = `${world.title}`;

  const make = () => renderCertificate({ name, title, world: world.title, skills, score, date, id });

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-lav-100 to-white pb-10">
      <header className="flex items-center gap-3 px-4 pt-[calc(14px+var(--safe-top))]">
        <button aria-label="Back" onClick={() => (history.length > 1 ? router.back() : router.push("/profile"))} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card active:scale-95"><IconArrowLeft size={20} /></button>
        <h1 className="font-display text-xl font-semibold">Certificate</h1>
      </header>

      {done ? (
        <div className="px-5 pt-5">
          <div className="relative overflow-hidden rounded-[24px] p-[6px] shadow-float" style={{ background: `linear-gradient(135deg, ${world.theme.from}, ${world.theme.to})` }}>
            <div className="rounded-[20px] bg-[#FBF9FF] px-5 py-6 text-center">
              <div className="flex justify-center"><Mascot size={70} float={false} bare /></div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-grape-600">AIBI Certificate of AI Literacy</div>
              <div className="mt-3 text-xs text-ink-mute">This certifies that</div>
              <div className="font-display text-[30px] font-semibold leading-tight">{name}</div>
              <div className="mt-1 text-xs text-ink-mute">has demonstrated practical skills in</div>
              <div className="mt-1 font-display text-[22px] font-semibold text-grape-700">{world.theme.icon} {title}</div>
              <div className="mt-2 text-[11px] font-bold text-ink-soft">{skills.join(" · ")}</div>
              <div className="mx-auto mt-4 w-fit rounded-2xl bg-lav-100 px-5 py-2"><div className="font-display text-2xl font-semibold text-grape-600">{score}%</div><div className="text-[9px] font-black uppercase tracking-widest text-ink-mute">Demonstrated accuracy</div></div>
              <div className="mt-4 flex justify-between text-[10px] font-bold text-ink-mute"><span>{date}</span><span>{id}</span></div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button disabled={!!busy} onClick={async () => { setBusy("share"); await shareBlob(await make(), `aibi-certificate-${world.id}.png`, `I earned my AIBI certificate in ${world.title}! 🎓`); setBusy(""); }}>
              <IconShare size={18} /> {busy === "share" ? "…" : "Share"}
            </Button>
            <Button variant="secondary" disabled={!!busy} onClick={async () => {
              setBusy("download");
              const blob = await make();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `aibi-certificate-${world.id}.png`; a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1500);
              setBusy("");
            }}>
              <IconDownload size={18} /> {busy === "download" ? "…" : "Download"}
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-ink-mute">Add it to LinkedIn under Licences & certifications.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center px-8 pt-10 text-center">
          <Mascot size={120} mood="thinking" />
          <h2 className="mt-3 font-display text-2xl font-semibold">{world.title} certificate</h2>
          <p className="mt-1 text-ink-soft">Complete every lesson in World {world.n} to earn it.</p>
          <div className="mt-4 w-full"><Progress value={worldProgress(s, world.id)} /></div>
          <Button full className="mt-6" href="/learn">Continue learning</Button>
        </div>
      )}
    </div>
  );
}
