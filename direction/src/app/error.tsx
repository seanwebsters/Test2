"use client";

import { Pip } from "@/components/brand/Pip";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Pip mood="gentle" size={120} />
      <h1 className="h-display mt-4 text-3xl">Something went sideways</h1>
      <p className="mt-2 max-w-sm text-ink-2">Don&apos;t worry — your progress is safe. Give it another go.</p>
      <button className="btn-primary mt-6" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
