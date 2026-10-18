"use client";

import { useEffect } from "react";
import { useViewer } from "@/components/shell/Viewer";
import { post } from "@/lib/view/client-api";

export function MarkRead() {
  const { setUnread } = useViewer();
  useEffect(() => {
    post("/api/notifications/read", {}).then(() => setUnread(0)).catch(() => undefined);
  }, [setUnread]);
  return null;
}
