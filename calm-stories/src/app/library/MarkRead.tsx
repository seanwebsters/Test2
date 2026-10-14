"use client";

import { useRouter } from "next/navigation";

export function MarkRead() {
  const router = useRouter();
  return (
    <button
      className="text-xs text-mist hover:text-white"
      onClick={async () => {
        await fetch("/api/notifications/read", { method: "POST" });
        router.refresh();
      }}
    >
      Mark all read
    </button>
  );
}
