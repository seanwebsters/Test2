"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Logo } from "@/components/shell/Nav";
import { useApp } from "@/components/providers/AppState";
import { Loader2 } from "@/components/ui/Icon";

export function SignIn({ supabase }: { supabase: { url: string; anon: string } | null }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useApp();
  const router = useRouter();

  const client = () => createClient(supabase!.url, supabase!.anon, { auth: { persistSession: false } });

  const send = async () => {
    setBusy(true);
    setError(null);
    const { error } = await client().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };
  const verify = async () => {
    setBusy(true);
    setError(null);
    const { data, error } = await client().auth.verifyOtp({ email, token: code, type: "email" });
    if (error || !data.session) {
      setBusy(false);
      return setError(error?.message ?? "That code didn't work");
    }
    const res = await fetch("/api/auth/supabase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: data.session.access_token }) });
    setBusy(false);
    if (!res.ok) return setError("Sign-in failed on the server");
    await refresh();
    router.replace("/profile");
  };

  return (
    <div className="mx-auto max-w-md px-5 pb-safe-nav pt-[calc(40px+var(--safe-top))]">
      <Logo className="text-3xl" />
      <h1 className="display mt-10 text-[40px]">Keep your brain</h1>
      <p className="editorial mt-1 text-2xl text-cream-dim">across every device.</p>
      {supabase ? (
        <form onSubmit={(e) => { e.preventDefault(); void (sent ? verify() : send()); }} className="mt-8 space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent} placeholder="you@example.com" className="w-full rounded-2xl bg-ink-2 px-5 py-4 outline-none focus:ring-1 focus:ring-lime" autoComplete="email" />
          {sent && <input inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code from your email" className="w-full rounded-2xl bg-ink-2 px-5 py-4 tracking-widest outline-none focus:ring-1 focus:ring-lime" autoComplete="one-time-code" />}
          <button className="btn-lime h-14 w-full" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}{sent ? "Verify & sign in" : "Email me a code"}</button>
          {error && <p className="text-sm text-coral">{error}</p>}
          <p className="text-xs text-cream-mute">Your current guest progress moves to your account the first time you sign in.</p>
        </form>
      ) : (
        <div className="mt-8 rounded-[28px] bg-ink-2 p-5 text-sm leading-relaxed text-cream-dim">
          <div className="font-bold text-cream">Demo mode</div>
          <p className="mt-2">Accounts aren&apos;t configured on this server. You&apos;re using a guest profile saved on the server and linked to this browser by a secure cookie, so your progress, XP and cards persist here.</p>
          <p className="mt-2">To enable email sign-in, set <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and <code className="rounded bg-white/10 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.</p>
        </div>
      )}
    </div>
  );
}
