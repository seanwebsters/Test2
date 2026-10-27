import { ok, route } from "@/lib/http";
import { repo } from "@/lib/store";

export const GET = route(async () => ok({ batches: await (await repo()).listConceptBatches() }));
