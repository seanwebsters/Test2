import type { EpisodeScript } from "@/lib/types";
import { FLAGSHIP_SCRIPTS } from "./flagship";
import { CURIOSITY_SCRIPTS } from "./curiosity";
import { PILOT_SCRIPTS_A } from "./pilots-a";
import { PILOT_SCRIPTS_B } from "./pilots-b";

/** Written scripts keyed by episode id (`<series-slug>-<n>`). */
export const SCRIPTS: Record<string, EpisodeScript> = {
  ...FLAGSHIP_SCRIPTS,
  ...CURIOSITY_SCRIPTS,
  ...PILOT_SCRIPTS_A,
  ...PILOT_SCRIPTS_B,
};
