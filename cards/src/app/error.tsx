"use client";

import { btn } from "@/components/ui/styles";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-extrabold">Something went sideways.</h1>
        <p className="mt-2 text-bone-3">Your collection is safe — nothing is lost when a page fails to load.</p>
        {error.digest && <p className="mt-1 font-mono text-[11px] text-bone-4">Ref {error.digest}</p>}
        <button onClick={reset} className={`${btn("primary")} mt-6`}>Try again</button>
      </div>
    </div>
  );
}
