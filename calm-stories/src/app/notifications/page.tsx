import { getViewer } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";
import { SignInPrompt } from "@/components/SignInPrompt";
import { NotificationList } from "@/components/NotificationList";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const viewer = await getViewer();
  if (!viewer.user) return <SignInPrompt title="Notifications" body="Sign in to see new episodes from series you follow." />;
  const items = await listNotifications(viewer);
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <h1 className="font-serif text-4xl font-semibold">Notifications</h1>
      <p className="mt-1 text-sm text-mist">New episodes from series you follow{viewer.isCreator ? ", editorial decisions and production updates" : ""}. Choose what you hear about in Settings.</p>
      <NotificationList items={items.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link, read: n.read, createdAt: n.created_at }))} />
    </div>
  );
}
