"use client";

import { Empty, PanelHeader } from "../ui";

export function AudioPanel() {
  return (
    <div>
      <PanelHeader title="Audio" hint="Narrator, voice previews, ambience and mixing." />
      <Empty>Audio production is being connected in the next build step.</Empty>
    </div>
  );
}
