import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { Gate } from "@/components/Gate";
import { SignInPrompt } from "@/components/SignInPrompt";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Calm Stories" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer.user) return <SignInPrompt title="Calm Stories admin" body="Sign in with an editor account." />;
  if (!viewer.isAdmin) return <Gate title="Calm Stories admin" body="The admin dashboard is for Calm's editorial team." />;
  return (
    <div className="mx-auto max-w-screen-2xl px-4 pt-6 sm:px-6 lg:px-10">
      <AdminNav />
      <div className="pt-6">{children}</div>
    </div>
  );
}
