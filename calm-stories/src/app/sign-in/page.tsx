import { getDb } from "@/lib/db";
import { getViewer } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { DemoSignIn, type Persona } from "./DemoSignIn";

export const metadata = { title: "Sign in" };

const PERSONAS: { username: string; role: string; blurb: string }[] = [
  { username: "maya", role: "Premium listener", blurb: "Full catalogue, library, follows and recommendations." },
  { username: "visitor-free", role: "Free account", blurb: "Signed in without Calm Premium – previews only." },
  { username: "iris-vale", role: "Creator · Premium", blurb: "Community creator with published and draft series in Storymaker." },
  { username: "hana-okafor", role: "Creator · Free", blurb: "Creator permissions without a Premium subscription." },
  { username: "calm-editor", role: "Administrator", blurb: "Calm Production Studio: agents, editorial review and publishing." },
];

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next, reason } = await searchParams;
  const viewer = await getViewer();
  const db = getDb();
  const users = await db.list("users", { where: { username: PERSONAS.map((p) => p.username) } });
  const personas: Persona[] = PERSONAS.flatMap((p) => {
    const u = users.find((x) => x.username === p.username);
    return u ? [{ id: u.id, name: u.display_name, hue: u.avatar_hue, role: p.role, blurb: p.blurb }] : [];
  });
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-8">
      <h1 className="headline text-5xl">Welcome back</h1>
      {reason === "premium" && (
        <p className="mt-4 rounded-2xl border border-lavender/30 bg-lavender/10 p-4 text-sm">
          Your personal library, follows and recommendations are part of Calm Premium. Sign in as a Premium account to continue.
        </p>
      )}
      {env.authProvider === "demo" ? (
        <>
          <p className="mt-4 text-mist">
            This prototype uses <strong className="text-white">demo accounts</strong> in place of Calm&rsquo;s identity and subscription services. Choose a persona to explore each part of the platform.
          </p>
          <DemoSignIn personas={personas} currentId={viewer.user?.id ?? null} next={next ?? "/"} />
        </>
      ) : (
        <p className="mt-4 text-mist">Sign in with your Calm account. (Supabase Auth is configured – use the hosted sign-in flow.)</p>
      )}
    </div>
  );
}
