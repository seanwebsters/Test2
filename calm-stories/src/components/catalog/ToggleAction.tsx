"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cx } from "@/lib/util";

/**
 * Optimistic toggle for save / follow actions. Unauthenticated or non-premium
 * listeners are sent to sign in with a clear explanation instead of failing silently.
 */
export function ToggleAction({
  endpoint,
  payload,
  initial,
  onLabel,
  offLabel,
  icon,
  compact = false,
  allowed,
  className,
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  initial: boolean;
  onLabel: string;
  offLabel: string;
  icon: IconName;
  compact?: boolean;
  allowed: boolean;
  className?: string;
}) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!allowed) {
      router.push(`/sign-in?reason=premium&next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !on;
    setOn(next);
    setError(null);
    start(async () => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, value: next }),
      });
      if (!res.ok) {
        setOn(!next);
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Something went wrong.");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <span className="relative inline-flex">
      <button
        onClick={click}
        aria-pressed={on}
        disabled={pending}
        title={on ? onLabel : offLabel}
        className={cx(
          compact
            ? "flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-night/60 backdrop-blur hover:bg-white/10"
            : "btn-ghost",
          on && "border-lavender/50 text-lavender",
          className,
        )}
      >
        <Icon name={on ? "check" : icon} size={compact ? 16 : 16} />
        {!compact && <span>{on ? onLabel : offLabel}</span>}
        {compact && <span className="sr-only">{on ? onLabel : offLabel}</span>}
      </button>
      {error && (
        <span role="alert" className="absolute left-0 top-full mt-1 whitespace-nowrap rounded-lg bg-rose-500/90 px-2 py-1 text-xs">
          {error}
        </span>
      )}
    </span>
  );
}
