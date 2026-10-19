import { LoginForm } from "./LoginForm";

export const metadata = { title: "Studio sign in" };

export default async function StudioLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-6 pt-40 text-center">
      <h1 className="headline text-4xl">Sleep Stories Studio</h1>
      <p className="mt-3 text-sm text-mist">Enter the password you were given. Team passwords can see everything but can&rsquo;t change anything.</p>
      <LoginForm next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/studio"} />
    </div>
  );
}
