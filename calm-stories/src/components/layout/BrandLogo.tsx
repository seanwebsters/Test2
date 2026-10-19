import { cx } from "@/lib/util";

/** The Sleep Stories wordmark (with an optional STUDIO line). `onDark` uses the brighter copy so it reads on navy. */
export function BrandLogo({ onDark = true, studio = true, className, width = 180 }: { onDark?: boolean; studio?: boolean; className?: string; width?: number }) {
  return (
    <span className={cx("inline-flex flex-col items-start", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={onDark ? "/brand/sleep-stories-light.png" : "/brand/sleep-stories.png"} alt="Sleep Stories" width={width} height={Math.round((width * 303) / 1688)} style={{ width, height: "auto" }} />
      {studio && <span className={cx("mt-1.5 pl-0.5 text-[10.5px] font-semibold tracking-[0.5em]", onDark ? "text-[#cfc6ff]" : "text-[#4a3cb0]")}>STUDIO</span>}
    </span>
  );
}
