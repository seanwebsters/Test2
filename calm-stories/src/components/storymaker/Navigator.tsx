"use client";

import { cx } from "@/lib/util";
import { SECTIONS, useWorkspace, type SectionId } from "./WorkspaceContext";

const STAGES: { label: string; sections: SectionId[] }[] = [
  { label: "Idea", sections: ["overview"] },
  { label: "Worldbuilding", sections: ["world"] },
  { label: "Characters", sections: ["characters"] },
  { label: "Season planning", sections: ["seasons", "episodes"] },
  { label: "Scriptwriting", sections: ["scripts"] },
  { label: "Audio production", sections: ["audio"] },
  { label: "Artwork", sections: ["cover"] },
  { label: "Publishing", sections: ["publishing"] },
];

export function Navigator() {
  const { snapshot, section, setSection, episodeId, openEpisode } = useWorkspace();
  const done = (id: SectionId): boolean => {
    if (!snapshot) return false;
    switch (id) {
      case "overview":
        return true;
      case "world":
        return !!snapshot.bible?.world_name;
      case "characters":
        return snapshot.characters.length > 0;
      case "relationships":
        return snapshot.relationships.length > 0;
      case "seasons":
      case "episodes":
        return snapshot.episodes.length > 0;
      case "scripts":
        return snapshot.scripts.some((s) => s.current_version_id);
      case "audio":
        return snapshot.episodes.some((e) => e.audio_asset_id);
      case "cover":
        return true;
      case "publishing":
        return snapshot.reviews.length > 0;
    }
  };
  const stageIndex = STAGES.findIndex((st) => !st.sections.every(done));

  return (
    <div className="p-3">
      {snapshot ? (
        <p className="truncate px-2 pb-2 pt-1 font-serif text-lg font-semibold" title={snapshot.series.title}>
          {snapshot.series.title}
        </p>
      ) : (
        <p className="px-2 pb-2 pt-1 text-sm text-mist">Your story appears here as you create it.</p>
      )}
      <ul className="space-y-0.5">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              disabled={!snapshot}
              onClick={() => setSection(s.id)}
              aria-current={section === s.id ? "page" : undefined}
              className={cx(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:opacity-40",
                section === s.id ? "bg-white/10 text-white" : "text-mist hover:bg-white/5 hover:text-white",
              )}
            >
              {s.label}
              {snapshot && done(s.id) && <span className="h-1.5 w-1.5 rounded-full bg-lavender" aria-label="has content" />}
            </button>
            {s.id === "scripts" && section === "scripts" && snapshot && snapshot.episodes.length > 0 && (
              <ul className="mb-1 ml-3 border-l border-white/10 pl-2">
                {snapshot.episodes.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => openEpisode(e.id)} className={cx("w-full truncate rounded-lg px-2 py-1 text-left text-xs", episodeId === e.id ? "text-white" : "text-mist hover:text-white")}>
                      {e.number}. {e.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {snapshot && (
        <div className="mt-6 px-2">
          <p className="text-xs uppercase tracking-wider text-mist">Progress</p>
          <ol className="mt-2 space-y-1.5 text-xs">
            {STAGES.map((st, i) => (
              <li key={st.label} className={cx("flex items-center gap-2", i < stageIndex || stageIndex === -1 ? "text-white" : i === stageIndex ? "text-lavender" : "text-mist/60")}>
                <span className={cx("grid h-4 w-4 place-items-center rounded-full border text-[9px]", i < stageIndex || stageIndex === -1 ? "border-lavender bg-lavender text-night" : "border-current")}>
                  {i < stageIndex || stageIndex === -1 ? "✓" : i + 1}
                </span>
                {st.label}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
