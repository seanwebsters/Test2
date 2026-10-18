"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn } from "@/components/ui/styles";
import { post } from "@/lib/view/client-api";

export function FollowUser({ userId, following: f0 }: { userId: string; following: boolean }) {
  const [following, setFollowing] = useState(f0);
  const router = useRouter();
  return (
    <button
      className={btn(following ? "glass" : "light", "sm")}
      aria-pressed={following}
      onClick={async () => {
        setFollowing(!following);
        try {
          const r = await post<{ following: boolean }>("/api/follow/user", { userId });
          setFollowing(r.following);
          router.refresh();
        } catch {
          setFollowing(following);
        }
      }}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
