import Link from "next/link";
import { Award, Bell, BookOpen, CalendarClock, Gift, Layers, Sparkles, Users } from "lucide-react";
import { container, eyebrow } from "@/components/ui/styles";
import type { Notification } from "@/lib/db/types";
import { pageCtx } from "@/lib/view/page";
import { MarkRead } from "./MarkRead";

export const metadata = { title: "Notifications" };

const ICON: Record<Notification["kind"], typeof Bell> = {
  "daily-ready": Gift,
  "new-episode": BookOpen,
  "new-cards": Layers,
  completion: Award,
  "season-launch": CalendarClock,
  event: Sparkles,
  achievement: Award,
  social: Users,
  system: Bell,
};

export default async function NotificationsPage() {
  const { state, user } = await pageCtx();
  const list = state.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  return (
    <div className={`${container} max-w-3xl pt-10`}>
      <MarkRead />
      <div className="flex items-end justify-between">
        <div>
          <p className={eyebrow}>Notifications</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">What's new</h1>
        </div>
        <Link href="/settings#notifications" className="text-sm font-semibold text-bone-3 hover:text-bone">Preferences</Link>
      </div>
      <ul className="mt-8 space-y-2">
        {list.map((n) => {
          const Icon = ICON[n.kind];
          const inner = (
            <div className={`flex gap-4 rounded-2xl border p-4 ${n.readAt ? "border-white/5 bg-ink-2/60" : "border-ember/25 bg-ember/[0.06]"}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06]"><Icon size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{n.title}</p>
                <p className="mt-0.5 text-sm text-bone-3">{n.body}</p>
                <p className="mt-1 text-[11px] text-bone-4">{new Date(n.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</p>
              </div>
              {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-ember" aria-label="Unread" />}
            </div>
          );
          return <li key={n.id}>{n.href ? <Link href={n.href} className="focus-ring block rounded-2xl">{inner}</Link> : inner}</li>;
        })}
        {!list.length && <li className="rounded-2xl border border-white/10 p-10 text-center text-bone-3">No notifications yet. Follow a universe to hear about new episodes and cards.</li>}
      </ul>
      <p className="mt-6 text-[12px] text-bone-4">In-app notifications are live. Email and push delivery are wired to a channel interface but no provider is configured in this build.</p>
    </div>
  );
}
