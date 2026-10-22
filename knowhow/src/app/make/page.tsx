import { providerStatus } from "@/lib/ai/providers";
import { DEMO_PLANS } from "@/content/ai-demo";
import { MakeForm } from "./MakeForm";

export const metadata = { title: "Make me smarter about…" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
  const { prompt } = await searchParams;
  return <MakeForm status={providerStatus()} samples={DEMO_PLANS.map((p) => p.prompt)} initial={prompt ?? ""} />;
}
