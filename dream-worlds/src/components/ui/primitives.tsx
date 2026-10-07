"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({ eyebrow, title, href, action = "See all", className = "" }: { eyebrow?: string; title: string; href?: string; action?: string; className?: string }) {
  return (
    <div className={`mb-4 flex items-end justify-between gap-4 px-5 lg:px-10 ${className}`}>
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="font-display text-[22px] font-light leading-tight text-mist-100 lg:text-[28px]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-mist-300 transition hover:text-white">
          {action} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export function Rail({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 lg:scroll-px-10 lg:gap-4 lg:px-10 ${className}`}>
      {children}
    </div>
  );
}

export function NewBadge({ label = "New", className = "" }: { label?: string; className?: string }) {
  return (
    <span className={`rounded-full bg-ember-200/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-night-900 ${className}`}>{label}</span>
  );
}

export function Chip({ on, children, onClick, disabled, title }: { on?: boolean; children: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-4 py-2.5 text-[13px] font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-35 ${
        on ? "chip-on" : "border border-white/10 bg-white/[0.04] text-mist-200 hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

export function Meta({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-mist-300">
      <Icon className="h-3.5 w-3.5 opacity-80" />
      {children}
    </span>
  );
}

export function PageTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <div className="px-5 pt-14 lg:px-10 lg:pt-28">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="font-display text-[34px] font-light leading-[1.05] tracking-tight text-white lg:text-5xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-xl text-sm text-mist-300">{subtitle}</p>}
    </div>
  );
}
