"use client";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="max-w-md">
        <p className="eyebrow">Something went quiet</p>
        <h1 className="mt-3 font-display text-4xl font-light text-midnight">This page couldn&apos;t load</h1>
        <p className="mt-3 text-[14px] text-muted">{error.message || "An unexpected error occurred."}</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
