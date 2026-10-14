"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 pt-24 text-center">
      <div>
        <h1 className="headline text-5xl">Something went quiet</h1>
        <p className="mt-3 text-mist">We couldn&rsquo;t load this page. Your listening progress and work are safe.</p>
        <button onClick={reset} className="btn-primary mt-6">Try again</button>
      </div>
    </div>
  );
}
