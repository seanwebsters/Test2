"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { post } from "@/lib/view/client-api";
import { btn, type BtnKind } from "./styles";

export function FollowButton({ universeId, following: initial, kind = "glass", size = "md" }: { universeId: string; following: boolean; kind?: BtnKind; size?: "sm" | "md" | "lg" }) {
  const [following, setFollowing] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className={btn(following ? "glass" : kind, size)}
      aria-pressed={following}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setFollowing((f) => !f);
          try {
            const r = await post<{ following: boolean }>("/api/follow/universe", { universeId });
            setFollowing(r.following);
            router.refresh();
          } catch {
            setFollowing(initial);
          }
        })
      }
    >
      {following ? <Check size={16} /> : <Plus size={16} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
