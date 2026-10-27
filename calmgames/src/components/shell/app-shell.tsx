"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { LogoMark } from "./logo";
import { useStudio } from "@/lib/client-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const setSidebarOpen = useStudio((s) => s.setSidebarOpen);
  return (
    <TooltipProvider>
      <Sidebar />
      <div className="lg:pl-64">
        <header className="glass sticky top-0 z-20 flex items-center gap-3 border-b border-line/60 px-4 py-3 lg:hidden">
          <button className="rounded-full p-2 hover:bg-ivory-deep" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <LogoMark className="size-7" />
          <span className="font-display text-midnight">Calm Game Studio</span>
        </header>
        <motion.main key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-h-screen overflow-x-clip">
          {children}
        </motion.main>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

function Toaster() {
  const { toasts, dismiss } = useStudio();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(380px,calc(100%-2.5rem))] flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={() => dismiss(t.id)}
            className={cn("pointer-events-auto rounded-2xl border px-4 py-3 text-left shadow-lift", t.tone === "error" ? "border-rose/30 bg-[#fbf1ef]" : "border-line bg-paper")}
          >
            <p className={cn("text-sm font-medium", t.tone === "error" ? "text-[#8f3f3f]" : "text-midnight")}>{t.title}</p>
            {t.body && <p className="mt-0.5 text-[13px] leading-snug text-muted">{t.body}</p>}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="font-display text-4xl leading-[1.08] font-light text-midnight sm:text-[44px]">{title}</h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-[1240px] px-4 py-10 sm:px-8 lg:px-12 lg:py-14", className)}>{children}</div>;
}
