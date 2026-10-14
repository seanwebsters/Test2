import Link from "next/link";
import { Logo } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/5 bg-night/60">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-mist">
            Original serialized Sleep Stories, included with Calm Premium. Calm Originals are produced by the Calm editorial team; Creator
            Originals are made by our community and reviewed before publication.
          </p>
          <p className="mt-4 max-w-sm text-xs text-mist/70">
            Sleep Stories are designed for relaxation and entertainment. They are not a medical treatment and make no clinical claims.
          </p>
        </div>
        <div>
          <h2 className="label">Listen</h2>
          <ul className="space-y-2 text-sm text-mist">
            <li><Link className="hover:text-white" href="/discover">Browse series</Link></li>
            <li><Link className="hover:text-white" href="/library">My Library</Link></li>
            <li><Link className="hover:text-white" href="/settings">Listening settings</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="label">Create</h2>
          <ul className="space-y-2 text-sm text-mist">
            <li><Link className="hover:text-white" href="/create">Calm Storymaker</Link></li>
            <li><Link className="hover:text-white" href="/studio">Creator Studio</Link></li>
            <li><Link className="hover:text-white" href="/policies">Content & rights policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-mist/60">Prototype · Calm Stories</div>
    </footer>
  );
}
