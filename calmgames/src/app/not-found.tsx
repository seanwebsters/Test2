import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <p className="eyebrow">Not found</p>
        <h1 className="mt-3 font-display text-4xl font-light text-midnight">Nothing lives here</h1>
        <Button asChild className="mt-6"><Link href="/">Back to the studio</Link></Button>
      </div>
    </div>
  );
}
