import { notFound } from "next/navigation";
import { FollowUser } from "@/components/social/FollowUser";
import { ProfileView } from "@/components/social/ProfileView";
import { pageCtx } from "@/lib/view/page";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { state, user: me, at } = await pageCtx();
  const user = Object.values(state.users).find((u) => u.username.toLowerCase() === decodeURIComponent(username).toLowerCase());
  if (!user || (user.isGuest && user.id !== me.id) || user.role === "admin") notFound();
  const following = state.userFollows.some((f) => f.followerId === me.id && f.followeeId === user.id);
  return <ProfileView state={state} user={user} at={at} actions={user.id !== me.id ? <FollowUser userId={user.id} following={following} /> : undefined} />;
}
