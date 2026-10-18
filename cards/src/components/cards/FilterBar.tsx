import Link from "next/link";

export interface FilterGroup {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

/** Link-based filters (work without JS, shareable URLs). */
export function FilterBar({ base, groups, current }: { base: string; groups: FilterGroup[]; current: Record<string, string | undefined> }) {
  const href = (key: string, value?: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(current)) if (v && k !== key) q.set(k, v);
    if (value) q.set(key, value);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="space-y-2.5">
      {groups.map((g) => (
        <div key={g.key} className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          <span className="w-16 shrink-0 text-[10.5px] font-bold uppercase tracking-[0.16em] text-bone-4">{g.label}</span>
          <Link href={href(g.key)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${!current[g.key] ? "bg-bone text-ink" : "text-bone-2 hover:bg-white/5"}`}>All</Link>
          {g.options.map((o) => (
            <Link key={o.value} href={href(g.key, o.value)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${current[g.key] === o.value ? "bg-bone text-ink" : "text-bone-2 hover:bg-white/5"}`}>
              {o.label}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
