"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Pip } from "@/components/brand/Pip";
import { DemoButton } from "@/components/landing/DemoButton";
import { api } from "@/lib/client";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(mode === "signin" ? "/api/auth/signin" : "/api/auth/signup", { body: { email, password } });
      const next = params.get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : mode === "signup" ? "/onboarding" : "/home");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 self-center">
        <Logo />
      </Link>
      <div className="mb-6 flex flex-col items-center text-center">
        <Pip mood={mode === "signin" ? "wave" : "happy"} size={96} />
        <h1 className="h-display mt-3 text-3xl">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-ink-2">{mode === "signin" ? "Your path is waiting." : "Then we'll find your direction together."}</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="eyebrow">Email</span>
          <input className="input mt-1.5" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="block">
          <span className="eyebrow">Password</span>
          <input className="input mt-1.5" type="password" required minLength={mode === "signup" ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        </label>
        {error && (
          <p className="rounded-2xl bg-coral-soft px-3 py-2 text-sm font-semibold text-coral" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "One sec…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs font-bold text-ink-3">
        <span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" />
      </div>
      <DemoButton className="w-full" label="Explore with a demo account" />
      <p className="mt-6 text-center text-sm text-ink-2">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <Link href="/onboarding" className="font-bold text-teal">
              Find your direction
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/signin" className="font-bold text-teal">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
