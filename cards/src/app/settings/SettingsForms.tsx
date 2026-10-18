"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { useViewer } from "@/components/shell/Viewer";
import { btn } from "@/components/ui/styles";
import type { UserSettings } from "@/lib/db/types";
import { ApiError, post } from "@/lib/view/client-api";

const field = "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm focus:border-white/30 focus:outline-none";
const label = "text-[12px] font-semibold text-bone-2";

function Section({ id, title, children, desc }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-white/10 bg-ink-2 p-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {desc && <p className="mt-1 text-sm text-bone-3">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toggle({ on, onChange, label: l, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-semibold">{l}</span>
        {hint && <span className="block text-[12px] text-bone-3">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`focus-ring relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-ember" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function SettingsForms({ profile, settings: s0, isGuest, role }: { profile: { displayName: string; username: string; bio: string; avatarSeed: number }; settings: UserSettings; isGuest: boolean; role: string }) {
  const router = useRouter();
  const { setSettings } = useViewer();
  const [p, setP] = useState(profile);
  const [s, setS] = useState(s0);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [reg, setReg] = useState({ username: "", displayName: profile.displayName === "Guest Collector" ? "" : profile.displayName, email: "", password: "" });
  const [login, setLogin] = useState({ username: "", password: "" });
  const say = (k: string, m: string) => setMsg((x) => ({ ...x, [k]: m }));

  const saveSettings = async (next: UserSettings) => {
    setS(next);
    setSettings({ sound: next.sound, haptics: next.haptics, reducedMotion: next.reducedMotion });
    try {
      await post("/api/me/settings", next);
      say("settings", "Saved");
    } catch (e) {
      say("settings", e instanceof ApiError ? e.message : "Couldn't save");
    }
  };

  return (
    <div className="space-y-6">
      <Section id="account" title="Account" desc={isGuest ? "You're a guest. Your collection lives on this device's session. Create an account to keep it safe." : `Signed in as @${profile.username}${role === "admin" ? " (Studio administrator)" : ""}.`}>
        {isGuest ? (
          <div className="grid gap-8 md:grid-cols-2">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await post("/api/auth/register", reg);
                  say("reg", "Account created. Your collection is saved.");
                  router.refresh();
                } catch (err) {
                  say("reg", err instanceof ApiError ? err.message : "Couldn't create account");
                }
              }}
            >
              <p className="font-bold">Create a free account</p>
              <p className="text-[12px] text-bone-3">Keeps every card you've already collected.</p>
              <label className="mt-3 block"><span className={label}>Username</span><input className={field} value={reg.username} onChange={(e) => setReg({ ...reg, username: e.target.value })} required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" autoComplete="username" /></label>
              <label className="mt-3 block"><span className={label}>Display name</span><input className={field} value={reg.displayName} onChange={(e) => setReg({ ...reg, displayName: e.target.value })} required maxLength={40} /></label>
              <label className="mt-3 block"><span className={label}>Email</span><input type="email" className={field} value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} required autoComplete="email" /></label>
              <label className="mt-3 block"><span className={label}>Password</span><input type="password" className={field} value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} required minLength={8} autoComplete="new-password" /></label>
              <button className={`${btn("primary")} mt-4`}>Create account</button>
              {msg.reg && <p className="mt-2 text-sm text-bone-2" role="status">{msg.reg}</p>}
            </form>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await post("/api/auth/signin", login);
                  router.push("/");
                  router.refresh();
                } catch (err) {
                  say("login", err instanceof ApiError ? err.message : "Couldn't sign in");
                }
              }}
            >
              <p className="font-bold">Already have an account?</p>
              <p className="text-[12px] text-bone-3">Signing in switches to that account's collection.</p>
              <label className="mt-3 block"><span className={label}>Username</span><input className={field} value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} required autoComplete="username" /></label>
              <label className="mt-3 block"><span className={label}>Password</span><input type="password" className={field} value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} required autoComplete="current-password" /></label>
              <button className={`${btn("glass")} mt-4`}>Sign in</button>
              {msg.login && <p className="mt-2 text-sm text-red-300" role="alert">{msg.login}</p>}
            </form>
          </div>
        ) : (
          <button
            className={btn("glass")}
            onClick={async () => {
              await post("/api/auth/signout", {});
              router.push("/");
              router.refresh();
            }}
          >
            Sign out
          </button>
        )}
      </Section>

      <Section id="profile" title="Profile">
        <form
          className="grid gap-4 md:grid-cols-[auto_1fr]"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await post("/api/me/profile", { displayName: p.displayName, bio: p.bio, avatarSeed: p.avatarSeed, ...(isGuest ? {} : { username: p.username }) });
              say("profile", "Profile saved");
              router.refresh();
            } catch (err) {
              say("profile", err instanceof ApiError ? err.message : "Couldn't save");
            }
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <Avatar seed={p.avatarSeed} name={p.displayName} size={88} />
            <input type="range" min={0} max={359} value={p.avatarSeed} onChange={(e) => setP({ ...p, avatarSeed: Number(e.target.value) })} aria-label="Avatar colour" className="w-28 accent-[#ff6a3d]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className={label}>Display name</span><input className={field} value={p.displayName} onChange={(e) => setP({ ...p, displayName: e.target.value })} maxLength={40} required /></label>
            <label><span className={label}>Username</span><input className={field} value={p.username} disabled={isGuest} onChange={(e) => setP({ ...p, username: e.target.value })} maxLength={24} /></label>
            <label className="sm:col-span-2"><span className={label}>Bio</span><textarea className={`${field} min-h-24`} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} maxLength={280} /></label>
            <div className="flex items-center gap-3 sm:col-span-2">
              <button className={btn("primary", "sm")}>Save profile</button>
              {msg.profile && <span className="text-sm text-bone-2" role="status">{msg.profile}</span>}
            </div>
          </div>
        </form>
      </Section>

      <Section id="experience" title="Experience">
        <Toggle on={s.sound} onChange={(v) => saveSettings({ ...s, sound: v })} label="Sound effects" hint="Pack openings and reveals" />
        <Toggle on={s.haptics} onChange={(v) => saveSettings({ ...s, haptics: v })} label="Haptics" hint="Vibration on supported devices" />
        <Toggle on={s.reducedMotion} onChange={(v) => saveSettings({ ...s, reducedMotion: v })} label="Reduce motion" hint="Simple fades instead of tears, flips and particles. Your system setting is always respected too." />
        {msg.settings && <p className="mt-2 text-[12px] text-bone-3">{msg.settings}</p>}
      </Section>

      <Section id="notifications" title="Notifications" desc="In-app notifications are live. Email and push need a delivery provider that isn't configured in this build; your choices are stored for when they are.">
        {(
          [
            ["dailyReady", "Daily pack ready"],
            ["newEpisodes", "New episodes in universes I follow"],
            ["newCards", "New cards in universes I follow"],
            ["completions", "Collection completions"],
            ["seasonLaunches", "Season launches"],
            ["events", "Special events"],
            ["email", "Email (provider not configured)"],
            ["push", "Push (provider not configured)"],
          ] as const
        ).map(([k, l]) => (
          <Toggle key={k} on={s.notifications[k]} onChange={(v) => saveSettings({ ...s, notifications: { ...s.notifications, [k]: v } })} label={l} />
        ))}
      </Section>
    </div>
  );
}
