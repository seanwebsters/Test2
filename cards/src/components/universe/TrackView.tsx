"use client";

import { useEffect } from "react";
import { track } from "@/lib/view/client-api";

export function TrackView({ universeId }: { universeId: string }) {
  useEffect(() => track("universe_viewed", universeId), [universeId]);
  return null;
}
