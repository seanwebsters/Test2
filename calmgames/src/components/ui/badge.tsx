import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-ivory-deep text-ink/75",
      lavender: "bg-lavender-soft text-[#4b3f7a]",
      coastal: "bg-coastal-soft text-[#2f5675]",
      sage: "bg-sage-soft text-[#3d5a3a]",
      peach: "bg-peach-soft text-[#86492b]",
      rose: "bg-rose/12 text-[#8f3f3f]",
      midnight: "bg-midnight text-ivory",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
