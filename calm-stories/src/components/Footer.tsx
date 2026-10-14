import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 pb-32 pt-12 text-sm text-mist sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-2">
          <p className="font-serif text-xl italic text-white">calm Stories</p>
          <p>
            Calm Stories is included with Calm Premium. There are no coins or per-episode purchases. Sleep Stories are designed for relaxation; we make no
            clinical claims about sleep outcomes.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2">
          <Link href="/discover" className="hover:text-white">Browse series</Link>
          <Link href="/create" className="hover:text-white">Calm Storymaker</Link>
          <Link href="/policies/content" className="hover:text-white">Content & AI policy</Link>
          <Link href="/policies/report" className="hover:text-white">Report a problem</Link>
          <Link href="/settings" className="hover:text-white">Settings & privacy</Link>
          <Link href="/policies/rights" className="hover:text-white">Copyright & rights</Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-screen-2xl text-xs text-mist/60">Prototype build. Features marked “Simulated” or “Sample data” are not connected to live services.</p>
    </footer>
  );
}
