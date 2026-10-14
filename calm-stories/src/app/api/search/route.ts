import { getViewer } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { searchCatalog } from "@/lib/services/catalog";

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 120);
  const genre = url.searchParams.get("genre");
  return json(await searchCatalog(await getViewer(), q, genre));
});
