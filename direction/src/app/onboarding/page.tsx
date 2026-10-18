import type { Metadata } from "next";
import { getSession } from "@/lib/server/page";
import { Onboarding } from "./Onboarding";

export const metadata: Metadata = { title: "Discover your direction" };

export default async function OnboardingPage() {
  const s = await getSession();
  return <Onboarding signedIn={!!s} initial={s?.state.profile.onboarding ?? null} />;
}
