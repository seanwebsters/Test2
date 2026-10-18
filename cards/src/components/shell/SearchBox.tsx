"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface Hit {
  kind: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const RECENT_KEY = "nx-recent-searches";

export function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function saveRecent(q: string) {
  try {
    const list = [q, ...loadRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function SearchBox({ autoFocus = false, wide = false }: { autoFocus?: boolean; wide?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setRecent(loadRecent()), [open]);
  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((d: { hits?: Hit[] }) => setHits(d.hits ?? []))
        .catch(() => undefined);
    }, 120);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const submit = (query = q) => {
    if (!query.trim()) return;
    saveRecent(query.trim());
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };
  const go = (h: Hit) => {
    saveRecent(q.trim() || h.title);
    setOpen(false);
    router.push(h.href);
  };

  return (
    <div ref={box} className={`relative ${wide ? "w-full" : "w-64 lg:w-72"}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (sel >= 0 && hits[sel]) go(hits[sel]!);
          else submit();
        }}
      >
        <label className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-sm focus-within:border-white/25">
          <Search size={16} className="text-bone-3" />
          <input
            value={q}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setSel(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setSel((s) => Math.min(s + 1, hits.length - 1));
              if (e.key === "ArrowUp") setSel((s) => Math.max(s - 1, -1));
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search worlds, characters, cards…"
            className="w-full bg-transparent text-bone placeholder:text-bone-4 focus:outline-none"
            aria-label="Search NEXARA"
            aria-autocomplete="list"
            aria-expanded={open}
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="text-bone-4 hover:text-bone">
              <X size={14} />
            </button>
          )}
        </label>
      </form>
      {open && (q.trim() ? hits.length > 0 : recent.length > 0) && (
        <div className="glass absolute right-0 top-12 z-50 w-[min(26rem,90vw)] overflow-hidden rounded-2xl p-1.5 shadow-lift" role="listbox">
          {q.trim()
            ? hits.slice(0, 8).map((h, i) => (
                <button key={`${h.kind}${h.id}`} role="option" aria-selected={i === sel} onClick={() => go(h)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${i === sel ? "bg-white/10" : "hover:bg-white/5"}`}>
                  <span className="w-[72px] shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-bone-4">{h.kind}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{h.title}</span>
                    <span className="block truncate text-xs text-bone-3">{h.subtitle}</span>
                  </span>
                </button>
              ))
            : (
                <>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-bone-4">Recent</p>
                  {recent.map((r) => (
                    <button key={r} onClick={() => submit(r)} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5">
                      {r}
                    </button>
                  ))}
                </>
              )}
        </div>
      )}
    </div>
  );
}
