"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useCelebrate } from "@/components/app/Celebrate";
import { api } from "@/lib/client";

export function BonusButton() {
  const router = useRouter();
  const { toast } = useCelebrate();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-ghost btn-sm w-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api("/api/today/bonus", { method: "POST", body: {} });
          toast("Bonus mission added ✨");
          router.refresh();
        } catch (e) {
          toast((e as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Plus size={16} /> Add a bonus mission
    </button>
  );
}
