import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      <p className="font-serif text-6xl italic text-lavender">Hush.</p>
      <h1 className="mt-4 font-serif text-3xl">This page drifted off to sleep.</h1>
      <p className="mt-3 text-mist">It may be private, unpublished, or it never existed.</p>
      <Link href="/" className="mt-8 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-night">
        Back to Calm Stories
      </Link>
    </div>
  );
}
