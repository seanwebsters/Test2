"use client";

import { useEffect } from "react";
import { saveRecent } from "@/components/shell/SearchBox";

/** Records a submitted query (recent searches locally; trending on the server). */
export function SearchRecorder({ q }: { q: string }) {
  useEffect(() => {
    if (!q.trim()) return;
    saveRecent(q.trim());
    fetch(`/api/search?q=${encodeURIComponent(q)}&record=1`).catch(() => undefined);
  }, [q]);
  return null;
}
