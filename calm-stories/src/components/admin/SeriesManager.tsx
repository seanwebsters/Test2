"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusPill } from "@/components/storymaker/ui";
import { cx } from "@/lib/util";
import { useAdminAction } from "./useAdminAction";

interface Row {
  id: string;
  slug: string;
  title: string;
  status: string;
  official: boolean;
  creator: string;
  episodes: number;
  published: number;
}

export function SeriesManager({ rows }: { rows: Row[] }) {
  const { call, pending, message } = useAdminAction();
  const [filter, setFilter] = useState<"all" | "official" | "community">("all");
  const shown = rows.filter((r) => filter === "all" || (filter === "official" ? r.official : !r.official));
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "official", "community"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cx("rounded-full px-3 py-1 text-xs capitalize", filter === f ? "bg-white/10 text-white" : "text-mist")}>
            {f === "official" ? "Calm Originals" : f}
          </button>
        ))}
        {message && <span role="status" className="ml-auto text-xs text-amber-200">{message}</span>}
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-white/[0.04] text-left text-xs text-mist">
            <tr>
              <th className="px-4 py-2 font-normal">Series</th>
              <th className="px-4 py-2 font-normal">Creator</th>
              <th className="px-4 py-2 font-normal">Episodes</th>
              <th className="px-4 py-2 font-normal">Status</th>
              <th className="px-4 py-2 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {shown.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5">
                  <Link href={`/series/${r.slug}`} className="hover:text-lavender">{r.title}</Link>
                  {r.official && <span className="ml-2 rounded-full bg-lavender/15 px-2 py-0.5 text-[10px] text-lavender">Calm Original</span>}
                </td>
                <td className="px-4 py-2.5 text-mist">{r.creator}</td>
                <td className="px-4 py-2.5 text-mist">{r.published} live / {r.episodes}</td>
                <td className="px-4 py-2.5"><StatusPill status={r.status} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1 text-xs">
                    {r.status !== "archived" && r.status !== "removed" && r.published > 0 && (
                      <button disabled={pending} onClick={() => call(`/api/admin/series/${r.id}`, "PATCH", { status: "archived" }, `Archived ${r.title}.`)} className="rounded-full border border-white/10 px-2.5 py-1 text-mist hover:text-white">Archive</button>
                    )}
                    {(r.status === "archived" || r.status === "removed") && (
                      <button disabled={pending} onClick={() => call(`/api/admin/series/${r.id}`, "PATCH", { status: r.published ? "published" : "draft" }, `Restored ${r.title}.`)} className="rounded-full border border-white/10 px-2.5 py-1 text-mist hover:text-white">Restore</button>
                    )}
                    {r.status !== "removed" && (
                      <button
                        disabled={pending}
                        onClick={() => {
                          const reason = window.prompt(`Remove “${r.title}” from Calm Stories? Give a reason for the creator.`);
                          if (reason) void call(`/api/admin/series/${r.id}`, "PATCH", { status: "removed", reason }, `Removed ${r.title}.`);
                        }}
                        className="rounded-full px-2.5 py-1 text-rose-200 hover:text-rose-100"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
