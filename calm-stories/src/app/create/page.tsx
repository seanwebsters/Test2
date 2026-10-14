import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { describeWriter } from "@/lib/ai";
import { Gate } from "@/components/Gate";
import { SignInPrompt } from "@/components/SignInPrompt";
import { Workspace } from "@/components/storymaker/Workspace";
import { getConversation } from "@/lib/storymaker/agent";
import { listMySeries, workspaceSnapshot } from "@/lib/storymaker/service";

export const metadata: Metadata = { title: "Storymaker" };

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ series?: string; new?: string; episode?: string }> }) {
  const viewer = await getViewer();
  if (!viewer.user) return <SignInPrompt title="Calm Storymaker" body="Sign in with a creator account to start building a Sleep Story series with your AI creative partner." />;
  if (!viewer.isCreator) {
    return <Gate title="Calm Storymaker" body="Storymaker is for Calm creators. It turns an idea into a series with a world, characters, scripts, narration and artwork, and every episode is reviewed before it's published." />;
  }
  const params = await searchParams;
  const mine = await listMySeries(viewer);
  const own = mine.filter((s) => s.creator_id === viewer.user!.id);
  const seriesId = params.new ? null : (params.series ?? own[0]?.id ?? null);
  const snapshot = seriesId ? await workspaceSnapshot(viewer, seriesId).catch(() => null) : null;
  const conversation = await getConversation(viewer, snapshot?.series.id ?? null);
  const writer = await describeWriter("chat");
  return (
    <Workspace
      snapshot={snapshot}
      conversation={conversation}
      writer={{ provider: writer.provider, model: writer.model, simulated: writer.simulated }}
      initialEpisodeId={params.episode ?? null}
      mySeries={mine.map((s) => ({ id: s.id, title: s.title, status: s.status }))}
    />
  );
}
