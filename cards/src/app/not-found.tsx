import Link from "next/link";
import { btn } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <p className="font-brand text-7xl font-bold text-white/10">404</p>
        <h1 className="mt-4 text-2xl font-extrabold">This corner of the multiverse is empty.</h1>
        <p className="mt-2 text-bone-3">The page you're looking for doesn't exist — or hasn't been released yet.</p>
        <Link href="/" className={`${btn("primary")} mt-6`}>Back to NEXARA</Link>
      </div>
    </div>
  );
}
