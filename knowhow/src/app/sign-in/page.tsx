import { SignIn } from "./SignIn";
export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";
export default function Page() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return <SignIn supabase={url && anon && process.env.SUPABASE_SERVICE_ROLE_KEY ? { url, anon } : null} />;
}
