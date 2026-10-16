import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { isEditor } from "@/lib/auth/policy";
import { AdminNav } from "./AdminNav";

export const metadata = { title: { default: "Admin", template: "%s · Calm Stories Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer.user || !isEditor(viewer)) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-32 text-center sm:px-8">
        <h1 className="headline text-5xl">Calm Stories Admin</h1>
        <p className="mt-4 text-mist">This workspace is for Calm&rsquo;s editorial team.</p>
        <Link href="/sign-in?next=/admin" className="btn-primary mt-6">Sign in as an administrator</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-16 pt-24 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-lavender">Internal</p>
          <h1 className="headline text-4xl">Calm Stories Admin</h1>
        </div>
        <AdminNav />
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
