import { LoginForm } from "./LoginForm";
import { BrandLogo } from "@/components/layout/BrandLogo";

export const metadata = { title: { absolute: "Sign in · Sleep Stories Studio" } };

export default async function StudioLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-6 pt-40 text-center">
      <h1 className="flex justify-center"><BrandLogo width={300} /></h1>
      <p className="mt-5 text-sm text-mist">Sean access only. Enter the passcode to open the rest of the studio. The studio home is open to the team.</p>
      <LoginForm next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/studio"} />
    </div>
  );
}
