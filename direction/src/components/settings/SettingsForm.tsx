"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, LogOut, Trash2 } from "lucide-react";
import { useCelebrate } from "@/components/app/Celebrate";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { api } from "@/lib/client";
import { TIME_OPTIONS } from "@/lib/content/onboarding";
import type { PrivacySettings } from "@/lib/engine/model";

const PRIVACY_LABELS: { key: keyof PrivacySettings; label: string; detail: string }[] = [
  { key: "passportPublic", label: "Public passport", detail: "Anyone with your link can view the sections below." },
  { key: "showDirection", label: "Show my direction", detail: "Your current career path." },
  { key: "showSkills", label: "Show my skills", detail: "Your skill tree." },
  { key: "showAchievements", label: "Show my badges", detail: "Achievements you've earned." },
  { key: "showProjects", label: "Show my projects", detail: "Project missions and their evidence." },
  { key: "showTimeline", label: "Show my timeline", detail: "Your journey milestones." },
  { key: "researchConsent", label: "Help improve Direction", detail: "Allow anonymised, aggregated usage to improve recommendations. Never sold, never shared with employers. Off by default." },
];

export function SettingsForm(props: { displayName: string; handle: string; minutes: number; privacy: PrivacySettings; plan: "free" | "plus"; planSource: string; renewsAt: string | null; isDemo: boolean; email: string | null }) {
  const router = useRouter();
  const { toast } = useCelebrate();
  const [name, setName] = useState(props.displayName);
  const [handle, setHandle] = useState(props.handle);
  const [minutes, setMinutes] = useState(props.minutes);
  const [privacy, setPrivacy] = useState(props.privacy);
  const [busy, setBusy] = useState(false);

  const patch = async (body: Record<string, unknown>, msg = "Saved") => {
    setBusy(true);
    try {
      await api("/api/profile", { method: "PATCH", body });
      toast(msg);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-5">
        <h2 className="h-display text-lg">Profile</h2>
        <label className="block">
          <span className="eyebrow">Display name</span>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </label>
        <label className="block">
          <span className="eyebrow">Handle</span>
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3">@</span>
            <input className="input pl-8" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} maxLength={24} />
          </div>
        </label>
        <button className="btn-primary btn-sm" disabled={busy} onClick={() => patch({ displayName: name, handle })}>
          Save profile
        </button>
        {props.email && <p className="text-xs text-ink-3">Signed in as {props.email}</p>}
        {props.isDemo && <p className="rounded-2xl bg-sun-soft p-3 text-xs">This is a demo account. Create your own account to keep your progress.</p>}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="h-display text-lg">Daily missions</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t.minutes}
              onClick={() => {
                setMinutes(t.minutes);
                void patch({ minutesPerDay: t.minutes }, "We'll tailor tomorrow's missions to that");
              }}
              aria-pressed={minutes === t.minutes}
              className={`chip justify-center ${minutes === t.minutes ? "!border-teal !bg-teal !text-white" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link href="/onboarding" className="text-sm font-bold text-teal">
          Retake the discovery quiz →
        </Link>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="h-display text-lg">Appearance</h2>
        <ThemeToggle />
      </section>

      <section className="card p-5">
        <h2 className="h-display text-lg">Privacy</h2>
        <p className="mt-1 text-sm text-ink-2">You control exactly what&apos;s public. We never sell your personal or career data.</p>
        <div className="mt-3 divide-y divide-line">
          {PRIVACY_LABELS.map((p) => (
            <label key={p.key} className="flex items-center justify-between gap-4 py-3">
              <span>
                <span className="block text-sm font-bold">{p.label}</span>
                <span className="block text-xs text-ink-3">{p.detail}</span>
              </span>
              <button
                role="switch"
                aria-checked={privacy[p.key]}
                aria-label={p.label}
                onClick={() => {
                  const next = { ...privacy, [p.key]: !privacy[p.key] };
                  setPrivacy(next);
                  void patch({ privacy: { [p.key]: next[p.key] } });
                }}
                className={`h-7 w-12 shrink-0 rounded-full p-0.5 transition ${privacy[p.key] ? "bg-teal" : "bg-surface-3"}`}
              >
                <span className={`block h-6 w-6 rounded-full bg-white shadow transition ${privacy[p.key] ? "translate-x-5" : ""}`} />
              </button>
            </label>
          ))}
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="h-display text-lg">Plan</h2>
        <p className="text-sm">
          You&apos;re on <strong>{props.plan === "plus" ? "Direction Plus" : "Direction Free"}</strong>
          {props.plan === "plus" && props.planSource === "mock" && " (demo checkout — no payment taken)"}
          {props.renewsAt && ` · renews ${new Date(props.renewsAt).toLocaleDateString("en-GB")}`}
        </p>
        {props.plan === "free" ? (
          <Link href="/plus" className="btn-primary btn-sm">
            See Plus
          </Link>
        ) : (
          props.planSource !== "stripe" && (
            <button
              className="btn-ghost btn-sm"
              disabled={busy}
              onClick={async () => {
                if (!confirm("Cancel Plus? You'll keep all your progress.")) return;
                await api("/api/billing/cancel", { method: "POST", body: {} });
                toast("Plan cancelled");
                router.refresh();
              }}
            >
              Cancel Plus
            </button>
          )
        )}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="h-display text-lg">Your data</h2>
        <a href="/api/account/export" className="btn-ghost btn-sm">
          <Download size={16} /> Download my data
        </a>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-ghost btn-sm"
            onClick={async () => {
              await api("/api/auth/signout", { method: "POST", body: {} });
              router.push("/");
              router.refresh();
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
          <button
            className="btn btn-sm border-2 border-coral/40 bg-coral-soft text-coral"
            onClick={async () => {
              if (!confirm("Permanently delete your account and all your data? This can't be undone.")) return;
              try {
                await api("/api/account", { method: "DELETE" });
                router.push("/");
                router.refresh();
              } catch (e) {
                toast((e as Error).message, "error");
              }
            }}
          >
            <Trash2 size={16} /> Delete account
          </button>
        </div>
        <Link href="/privacy" className="block text-xs font-semibold text-ink-3 underline">
          How we handle your data
        </Link>
      </section>
    </div>
  );
}
