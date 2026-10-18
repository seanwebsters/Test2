import Link from "next/link";
import type { ReactNode } from "react";
import { container } from "@/components/ui/styles";

/** Editorial horizontal carousel. */
export function Row({ title, subtitle, href, children, id }: { title: string; subtitle?: string; href?: string; children: ReactNode; id?: string }) {
  return (
    <section className="mt-12 first:mt-8" aria-labelledby={id}>
      <div className={`${container} mb-4 flex items-end justify-between gap-4`}>
        <div>
          <h2 id={id} className="text-xl font-extrabold tracking-tight md:text-[22px]">{title}</h2>
          {subtitle && <p className="mt-1 text-[13px] text-bone-3">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="focus-ring shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-bone-3 hover:text-bone">
            See all
          </Link>
        )}
      </div>
      <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 md:scroll-px-8 md:px-8 [&>*:last-child]:mr-4">
        {children}
      </div>
    </section>
  );
}
