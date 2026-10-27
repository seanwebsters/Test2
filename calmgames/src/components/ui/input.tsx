import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn("h-10 w-full rounded-full border border-line bg-paper px-4 text-sm text-ink placeholder:text-muted/70 transition focus:border-coastal focus:outline-none focus:ring-4 focus:ring-coastal/15", className)}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn("w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-muted/70 transition focus:border-coastal focus:outline-none focus:ring-4 focus:ring-coastal/15", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("eyebrow mb-2 block", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("h-10 w-full appearance-none rounded-full border border-line bg-paper px-4 pr-9 text-sm text-ink focus:border-coastal focus:outline-none focus:ring-4 focus:ring-coastal/15 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b6f7d%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat", className)} {...props} />;
}
