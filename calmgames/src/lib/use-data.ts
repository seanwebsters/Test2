"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/** Fetch JSON from the studio API, optionally polling while `poll(data)` is true. */
export function useData<T>(path: string | null, opts: { poll?: (data: T) => boolean; interval?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const load = useCallback(async () => {
    if (!path) return null;
    try {
      const d = await api<T>(path);
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const d = await load();
      if (!alive) return;
      const { poll, interval = 1200 } = optsRef.current;
      if (d && poll?.(d)) timer = setTimeout(tick, interval);
    };
    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [load]);

  /** Reload now and resume polling if the predicate asks for it. */
  const refresh = useCallback(async () => {
    const d = await load();
    const { poll, interval = 1200 } = optsRef.current;
    if (d && poll?.(d)) {
      const again = async () => {
        const n = await load();
        if (n && optsRef.current.poll?.(n)) setTimeout(again, interval);
      };
      setTimeout(again, interval);
    }
    return d;
  }, [load]);

  return { data, error, loading, refresh, setData };
}
