import Link from "next/link";
import { Pip } from "@/components/brand/Pip";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Pip mood="curious" size={130} />
      <h1 className="h-display mt-4 text-3xl">This path doesn&apos;t exist (yet)</h1>
      <p className="mt-2 text-ink-2">Even Pip&apos;s compass couldn&apos;t find that page.</p>
      <Link href="/" className="btn-primary mt-6">
        Take me home
      </Link>
    </div>
  );
}
