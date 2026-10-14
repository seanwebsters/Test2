"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cx, relativeTime } from "@/lib/util";

export interface NotificationItem {
  id: string;
  kind: "new_episode" | "review" | "production" | "system";
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const KIND: Record<NotificationItem["kind"], string> = { new_episode: "New episode", review: "Editorial review", production: "Production", system: "From Calm" };

export function NotificationList({ items: initial }: { items: NotificationItem[] }) {
  const [items, setItems] = useState(initial);
  const router = useRouter();
  const unread = items.filter((n) => !n.read).length;
  const mark = async (body: { ids?: string[]; all?: boolean }) => {
    setItems((list) => list.map((n) => (body.all || body.ids?.includes(n.id) ? { ...n, read: true } : n)));
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => undefined);
    router.refresh();
  };
  if (!items.length) return <p className="mt-10 rounded-3xl border border-dashed border-white/15 p-8 text-center text-sm text-mist">Nothing yet. Follow a series to hear when new episodes arrive.</p>;
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-mist" aria-live="polite">{unread ? `${unread} unread` : "All caught up"}</p>
        {unread > 0 && <button onClick={() => mark({ all: true })} className="text-sm text-lavender hover:text-white">Mark all as read</button>}
      </div>
      <ul className="mt-3 divide-y divide-white/5">
        {items.map((n) => {
          const content = (
            <>
              <span className="block text-[11px] uppercase tracking-wider text-mist">{KIND[n.kind]} · {relativeTime(n.createdAt)}</span>
              <span className={cx("block", !n.read && "font-semibold")}>{n.title}</span>
              {n.body && <span className="mt-0.5 block text-sm text-mist">{n.body}</span>}
            </>
          );
          return (
            <li key={n.id} className="flex gap-3 py-3">
              <span aria-hidden className={cx("mt-2 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-lavender")} />
              <div className="min-w-0 flex-1">
                {n.link ? <Link href={n.link} onClick={() => !n.read && void mark({ ids: [n.id] })} className="block hover:text-lavender">{content}</Link> : content}
                {!n.read && <span className="sr-only">Unread</span>}
              </div>
              {!n.read && <button onClick={() => mark({ ids: [n.id] })} className="shrink-0 self-start text-xs text-mist hover:text-white" aria-label={`Mark “${n.title}” as read`}>Mark read</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
