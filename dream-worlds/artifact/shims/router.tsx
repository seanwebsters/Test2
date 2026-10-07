/**
 * In-memory router used by the single-file artifact build. The hosted page
 * can't use real URLs, so routes live in React state with a back stack.
 * `next/link` and `next/navigation` are aliased to this module.
 */
import { createContext, forwardRef, useCallback, useContext, useMemo, useState } from "react";

type Loc = { path: string; search: string };
interface Router {
  loc: Loc;
  params: Record<string, string>;
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
}
const Ctx = createContext<Router | null>(null);

const parse = (href: string): Loc => {
  const clean = href.split("#")[0] || "/";
  const [path, search = ""] = clean.split("?");
  return { path: path || "/", search };
};

export function RouterProvider({ children, match }: { children: (loc: Loc, params: Record<string, string>) => React.ReactNode; match: (path: string) => Record<string, string> }) {
  const [stack, setStack] = useState<Loc[]>([{ path: "/", search: "" }]);
  const loc = stack[stack.length - 1];
  const top = () => requestAnimationFrame(() => window.scrollTo(0, 0));
  const push = useCallback((h: string) => (setStack((s) => [...s, parse(h)]), top()), []);
  const replace = useCallback((h: string) => (setStack((s) => [...s.slice(0, -1), parse(h)]), top()), []);
  const back = useCallback(() => (setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ path: "/", search: "" }])), top()), []);
  const params = useMemo(() => match(loc.path), [loc.path, match]);
  const value = useMemo(() => ({ loc, params, push, replace, back }), [loc, params, push, replace, back]);
  return <Ctx.Provider value={value}>{children(loc, params)}</Ctx.Provider>;
}

const useR = () => {
  const r = useContext(Ctx);
  if (!r) throw new Error("router missing");
  return r;
};

/* next/navigation */
export const useRouter = () => {
  const r = useR();
  return { push: r.push, replace: r.replace, back: r.back, prefetch: () => {}, refresh: () => {}, forward: () => {} };
};
export const usePathname = () => useR().loc.path;
export const useParams = <T,>() => useR().params as T;
export const useSearchParams = () => {
  const s = useR().loc.search;
  return useMemo(() => new URLSearchParams(s), [s]);
};

/* next/link */
type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean; scroll?: boolean; replace?: boolean };
const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ href, onClick, prefetch: _p, scroll: _s, replace, ...rest }, ref) {
  const r = useR();
  return (
    <a
      ref={ref}
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || /^https?:/.test(href)) return;
        e.preventDefault();
        replace ? r.replace(href) : r.push(href);
      }}
    />
  );
});
export default Link;
