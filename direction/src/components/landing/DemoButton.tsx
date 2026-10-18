"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCelebrate } from "@/components/app/Celebrate";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";

export function DemoButton({ className, label = "Try the demo" }: { className?: string; label?: string }) {
  const router = useRouter();
  const { toast } = useCelebrate();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={cn("btn-ghost", className)}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/auth/demo", { method: "POST", body: {} });
          router.push("/home");
          router.refresh();
        } catch (e) {
          toast((e as Error).message, "error");
          setBusy(false);
        }
      }}
    >
      {busy ? "Setting up Maya's journey…" : label}
    </button>
  );
}
