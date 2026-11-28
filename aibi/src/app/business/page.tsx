"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Mascot from "@/components/Mascot";
import { Button, Progress } from "@/components/ui";
import { IconArrowLeft, IconCheck } from "@/components/icons";

const BENEFITS = [
  { icon: "🎯", title: "Role-based learning paths", sub: "Tailored tracks for HR, sales, finance, operations and leadership." },
  { icon: "🛡️", title: "Safe, policy-aware training", sub: "Teach your AI policy, approved tools and data-handling rules inside every lesson." },
  { icon: "📊", title: "Team insights dashboard", sub: "See adoption, skills and confidence grow across every department." },
  { icon: "🏅", title: "Verified certificates", sub: "Evidence of AI literacy for compliance, appraisals and upskilling records." },
  { icon: "🔐", title: "Enterprise-ready", sub: "Single sign-on, admin controls and private AI deployments." },
];

const PREVIEW = [
  { team: "Marketing", pct: 0.82, people: 14 },
  { team: "Customer Support", pct: 0.67, people: 32 },
  { team: "Finance", pct: 0.54, people: 9 },
  { team: "Operations", pct: 0.41, people: 21 },
];

export default function BusinessPage() {
  const router = useRouter();
  const [form, setForm] = useState({ company: "", email: "", size: "10–50" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async () => {
    setState("sending");
    try {
      const r = await fetch("/api/business-interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Something went wrong — please try again.");
      setState("sent");
    } catch (e) {
      setError((e as Error).message);
      setState("error");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-lav-50 pb-12">
      <div className="relative overflow-hidden bg-ink px-5 pb-10 pt-[calc(14px+var(--safe-top))] text-white">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-grape-500/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-rose-400/30 blur-3xl" />
        <button aria-label="Back" onClick={() => (history.length > 1 ? router.back() : router.push("/"))} className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 active:scale-95">
          <IconArrowLeft size={20} />
        </button>
        <div className="relative mt-4 text-xs font-black uppercase tracking-[0.2em] text-lav-200">AIBI for Business · Coming soon</div>
        <h1 className="relative mt-2 font-display text-[36px] font-semibold leading-[1.05]">Make your whole team AI-confident.</h1>
        <p className="relative mt-3 max-w-[330px] text-[16px] text-white/80">Five-minute daily lessons that turn AI curiosity into safe, productive everyday skills — for every role.</p>
        <div className="relative mt-4 flex justify-end"><Mascot size={120} mood="cheer" equipped={{ neck: "bowtie", face: "glasses" }} /></div>
      </div>

      <div className="-mt-6 space-y-3 px-5">
        {BENEFITS.map((b, i) => (
          <motion.div key={b.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3 rounded-3xl bg-white p-4 shadow-card">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lav-100 text-2xl">{b.icon}</span>
            <div>
              <div className="font-display text-[17px] font-semibold">{b.title}</div>
              <div className="text-sm text-ink-soft">{b.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mx-5 mt-7 rounded-[28px] bg-white p-5 shadow-float">
        <div className="flex items-center justify-between">
          <div className="font-display text-lg font-semibold">Admin dashboard</div>
          <span className="rounded-full bg-lav-100 px-2.5 py-1 text-[11px] font-black uppercase text-grape-600">Preview</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[["76", "Learners"], ["68%", "Active weekly"], ["412", "Certificates"]].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-lav-50 p-2.5"><div className="font-display text-xl font-semibold text-grape-600">{v}</div><div className="text-[11px] font-bold text-ink-mute">{l}</div></div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {PREVIEW.map((t) => (
            <div key={t.team}>
              <div className="flex justify-between text-sm font-bold"><span>{t.team} <span className="text-ink-mute">· {t.people}</span></span><span className="text-grape-600">{Math.round(t.pct * 100)}%</span></div>
              <Progress value={t.pct} height={8} className="mt-1" />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-mute">Illustrative example of the team dashboard.</p>
      </div>

      <div className="mx-5 mt-7 rounded-[28px] bg-gradient-to-br from-grape-500 to-rose-400 p-5 text-white shadow-float">
        <div className="font-display text-2xl font-semibold">Join the early access list</div>
        <p className="mt-1 text-sm text-white/85">Pilot pricing for teams of 10 or more. We&apos;ll tailor a programme to your organisation.</p>
        {state === "sent" ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/20 p-4 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-mint-600"><IconCheck size={18} strokeWidth={3} /></span>
            Thanks — we&apos;ve received your details and will be in touch.
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" className="h-12 w-full rounded-2xl bg-white px-4 text-ink outline-none placeholder:text-ink-mute" />
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Work email" className="h-12 w-full rounded-2xl bg-white px-4 text-ink outline-none placeholder:text-ink-mute" />
            <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className="h-12 w-full rounded-2xl bg-white px-4 text-ink outline-none">
              {["10–50", "51–250", "251–1,000", "1,000+"].map((x) => <option key={x}>{x} people</option>)}
            </select>
            {state === "error" && <p className="text-sm font-bold text-white">{error}</p>}
            <Button variant="white" full disabled={state === "sending" || !form.company || !form.email} onClick={submit}>{state === "sending" ? "Sending…" : "Request early access"}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
