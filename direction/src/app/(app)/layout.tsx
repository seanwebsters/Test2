import { AppShell } from "@/components/app/AppShell";
import { getSession } from "@/lib/server/page";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  const stats = s
    ? {
        streak: s.overview.streak.current,
        streakAlive: s.overview.streak.alive,
        doneToday: s.overview.streak.doneToday,
        xp: s.overview.totalXp,
        plan: s.state.profile.plan,
        name: s.state.profile.displayName,
      }
    : null;
  return <AppShell stats={stats}>{children}</AppShell>;
}
