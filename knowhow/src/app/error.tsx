"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[80svh] place-items-center px-6 text-center">
      <div>
        <div className="display text-5xl">Well, that&apos;s not interesting.</div>
        <p className="mt-3 text-cream-dim">Something broke on our side. Try again?</p>
        <button onClick={reset} className="btn-lime mt-8">Try again</button>
      </div>
    </div>
  );
}
