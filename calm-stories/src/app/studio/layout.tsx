import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { Gate } from "@/components/Gate";
import { SignInPrompt } from "@/components/SignInPrompt";
import { StudioNav } from "@/components/studio/StudioNav";

export const metadata: Metadata = { title: { default: "Creator Studio", template: "%s · Creator Studio · Calm Stories" } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer.user) return <SignInPrompt title="Creator Studio" body="Sign in to manage your series." />;
  if (!viewer.isCreator) return <Gate title="Creator Studio" body="Creator Studio is for Calm Stories creators." cta={{ href: "/create", label: "Learn about creating" }} />;
  return (
    <div className="mx-auto max-w-screen-2xl px-4 pt-6 sm:px-6 lg:px-10">
      <StudioNav />
      <div className="pt-6">{children}</div>
    </div>
  );
}
