import Link from "next/link";
import { SceneArt } from "@/components/art/SceneArt";

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-[80vh] items-center justify-center overflow-hidden px-4 pt-24 text-center">
      <SceneArt spec={{ scene: "lake", palette: ["#0b1a36", "#2d4870", "#ffb48a", "#d2f0ff"], seed: 404 }} className="absolute inset-0 -z-10 h-full w-full opacity-60" />
      <div className="absolute inset-0 -z-10 bg-night/60" />
      <div>
        <h1 className="headline text-6xl">This path fades into the mist</h1>
        <p className="mt-4 text-mist">The page you were looking for isn&rsquo;t here – or isn&rsquo;t public yet.</p>
        <Link href="/" className="btn-primary mt-8">Back to Calm Stories</Link>
      </div>
    </div>
  );
}
