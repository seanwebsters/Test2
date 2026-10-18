import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/passport/PrintButton";
import { PassportView } from "@/components/passport/PassportView";
import { requireSession } from "@/lib/server/page";

export const metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const s = await requireSession();
  return (
    <div>
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-bold text-ink-3">
          <ArrowLeft size={16} /> Passport
        </Link>
        <PrintButton />
      </div>
      <p className="no-print mb-6 rounded-3xl bg-surface-2 p-4 text-sm text-ink-2">This is your full portfolio, generated from your missions and Passport. Save it as a PDF to attach to applications. It includes private entries — only you can see this page.</p>
      <PassportView state={s.state} today={s.today} mode="portfolio" show={{ showDirection: true, showSkills: true, showAchievements: true, showProjects: true, showTimeline: false }} />
    </div>
  );
}
