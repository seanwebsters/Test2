"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useViewer } from "@/components/shell/Viewer";
import { btn } from "@/components/ui/styles";
import { ApiError, post } from "@/lib/view/client-api";

export function ChallengeClaim({ challengeKey, reward }: { challengeKey: string; reward: number }) {
  const { setWallet } = useViewer();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState<string>();
  if (state === "done") return <span className="text-[12px] font-bold text-uncommon">+{reward} claimed</span>;
  return (
    <span className="flex flex-col items-end">
      <button
        className={btn("primary", "sm")}
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            const r = await post<{ wallet: never }>("/api/daily/challenge", { key: challengeKey });
            setWallet(r.wallet);
            setState("done");
            router.refresh();
          } catch (e) {
            setErr(e instanceof ApiError ? e.message : "Try again");
            setState("idle");
          }
        }}
      >
        Claim +{reward}
      </button>
      {err && <span className="mt-1 text-[11px] text-red-300">{err}</span>}
    </span>
  );
}
