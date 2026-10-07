import { createRoot } from "react-dom/client";
import { RouterProvider } from "./shims/router";
import { DreamStoreProvider } from "@/lib/store";
import { AppShell } from "@/components/nav/AppShell";
import "@/app/globals.css";

import Home from "@/app/page";
import Explore from "@/app/explore/page";
import Create from "@/app/create/page";
import Dream from "@/app/dream/[id]/page";
import Play from "@/app/play/[id]/page";
import Morning from "@/app/morning/[id]/page";
import MyDreams from "@/app/my-dreams/page";
import You from "@/app/you/page";
import New from "@/app/new/page";
import World from "@/app/world/[id]/page";
import Pitch from "@/app/pitch/page";

const ROUTES: [RegExp, React.ComponentType][] = [
  [/^\/$/, Home],
  [/^\/explore$/, Explore],
  [/^\/create$/, Create],
  [/^\/dream\/(?<id>[^/]+)$/, Dream],
  [/^\/play\/(?<id>[^/]+)$/, Play],
  [/^\/morning\/(?<id>[^/]+)$/, Morning],
  [/^\/my-dreams$/, MyDreams],
  [/^\/you$/, You],
  [/^\/new$/, New],
  [/^\/world\/(?<id>[^/]+)$/, World],
  [/^\/pitch$/, Pitch],
];

const match = (path: string) => {
  for (const [re] of ROUTES) {
    const m = path.match(re);
    if (m) return { ...(m.groups ?? {}) };
  }
  return {};
};

function App() {
  return (
    <DreamStoreProvider>
      <RouterProvider match={match}>
        {(loc) => {
          const Page = ROUTES.find(([re]) => re.test(loc.path))?.[1] ?? Home;
          return (
            <AppShell>
              <Page key={loc.path + loc.search} />
            </AppShell>
          );
        }}
      </RouterProvider>
    </DreamStoreProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
