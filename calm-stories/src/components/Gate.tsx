import Link from "next/link";

/** Shown when a page needs a role or tier the viewer does not have. */
export function Gate({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl font-semibold">{title}</h1>
      <p className="mt-4 text-mist">{body}</p>
      <p className="mt-6 text-sm text-mist">In this prototype, use the account menu (top right) to switch to a persona with access.</p>
      {cta && (
        <Link href={cta.href} className="mt-8 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-night">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
