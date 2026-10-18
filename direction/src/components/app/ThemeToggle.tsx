"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Theme = "system" | "light" | "dark";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem("direction-theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);
  const apply = (t: Theme) => {
    setTheme(t);
    try {
      if (t === "system") localStorage.removeItem("direction-theme");
      else localStorage.setItem("direction-theme", t);
    } catch {}
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  };
  const opts: { id: Theme; icon: typeof Sun; label: string }[] = [
    { id: "light", icon: Sun, label: "Light" },
    { id: "system", icon: Monitor, label: "System" },
    { id: "dark", icon: Moon, label: "Dark" },
  ];
  return (
    <div className={cn("inline-flex rounded-2xl bg-surface-2 p-1", className)} role="radiogroup" aria-label="Theme">
      {opts.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={theme === o.id}
          onClick={() => apply(o.id)}
          className={cn("focus-ring flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-ink-3 transition", theme === o.id && "bg-surface text-ink shadow-card")}
        >
          <o.icon size={15} /> {o.label}
        </button>
      ))}
    </div>
  );
}
