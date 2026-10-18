"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, FileText, Globe, Lock } from "lucide-react";
import { useCelebrate } from "@/components/app/Celebrate";
import { api } from "@/lib/client";

export function ShareCard({ handle, isPublic }: { handle: string; isPublic: boolean }) {
  const router = useRouter();
  const { toast } = useCelebrate();
  const [pub, setPub] = useState(isPublic);
  const url = typeof window !== "undefined" ? `${window.location.origin}/p/${handle}` : `/p/${handle}`;
  const toggle = async () => {
    const next = !pub;
    setPub(next);
    try {
      await api("/api/profile", { method: "PATCH", body: { privacy: { passportPublic: next } } });
      toast(next ? "Your passport is now public" : "Your passport is private");
      router.refresh();
    } catch (e) {
      setPub(!next);
      toast((e as Error).message, "error");
    }
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-display font-bold">
          {pub ? <Globe size={18} className="text-teal" /> : <Lock size={18} className="text-ink-3" />} {pub ? "Public passport" : "Private passport"}
        </div>
        <button onClick={toggle} role="switch" aria-checked={pub} aria-label="Make passport public" className={`h-7 w-12 rounded-full p-0.5 transition ${pub ? "bg-teal" : "bg-surface-3"}`}>
          <span className={`block h-6 w-6 rounded-full bg-white shadow transition ${pub ? "translate-x-5" : ""}`} />
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-2">{pub ? "Anyone with the link can see the sections you allow in Settings." : "Only you can see your passport. Turn it on to share your progress."}</p>
      {pub && (
        <div className="mt-3 flex gap-2">
          <Link href={`/p/${handle}`} className="btn-ghost btn-sm flex-1 truncate" target="_blank">
            /p/{handle}
          </Link>
          <button
            className="btn-ghost btn-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast("Link copied");
              } catch {
                toast(url);
              }
            }}
            aria-label="Copy link"
          >
            <Copy size={16} />
          </button>
        </div>
      )}
      <Link href="/profile/portfolio" className="btn-primary btn-sm mt-3 w-full">
        <FileText size={16} /> Generate portfolio
      </Link>
    </div>
  );
}
