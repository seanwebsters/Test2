import { LoginForm } from "./LoginForm";

export const metadata = { title: "Studio sign in" };

export default async function StudioLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-6 pt-40 text-center">
      <h1 className="headline text-4xl">Sleep Stories Studio</h1>
      <p className="mt-3 text-sm text-mist">Sean access only. Enter the passcode to open the rest of the studio – the AI Team page is open to the team.</p>
      <LoginForm next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/studio"} />
    </div>
  );
}
