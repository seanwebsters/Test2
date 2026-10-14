"use client";

import { Empty } from "./ui";
import { CoverPanel, EpisodesPanel, PublishingPanel, SeasonsPanel } from "./panels/PlanPanels";
import { ScriptEditor } from "./panels/ScriptEditor";
import { CharactersPanel, OverviewPanel, RelationshipsPanel, WorldPanel } from "./panels/StoryPanels";
import { AudioPanel } from "./panels/AudioPanel";
import { useWorkspace } from "./WorkspaceContext";

export function Preview() {
  const { snapshot, section } = useWorkspace();
  return (
    <div className="px-4 py-6 sm:px-6">
      {!snapshot ? (
        <Empty>
          <p className="font-serif text-2xl text-white">Live preview</p>
          <p className="mt-2">As you shape your idea, the series, its world, characters and episodes appear here.</p>
        </Empty>
      ) : section === "overview" ? (
        <OverviewPanel />
      ) : section === "world" ? (
        <WorldPanel />
      ) : section === "characters" ? (
        <CharactersPanel />
      ) : section === "relationships" ? (
        <RelationshipsPanel />
      ) : section === "seasons" ? (
        <SeasonsPanel />
      ) : section === "episodes" ? (
        <EpisodesPanel />
      ) : section === "scripts" ? (
        <ScriptEditor />
      ) : section === "audio" ? (
        <AudioPanel />
      ) : section === "cover" ? (
        <CoverPanel />
      ) : (
        <PublishingPanel />
      )}
    </div>
  );
}
