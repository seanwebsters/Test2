// Bundles the browser game runtime into .runtime/. The studio inlines these
// files into every game it serves or exports, so games need no network.
import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync(".runtime", { recursive: true });
const common = { bundle: true, minify: true, format: "iife", target: ["es2022"], legalComments: "none", logLevel: "warning" };
await build({ ...common, entryPoints: ["src/runtime/index.ts"], outfile: ".runtime/calm-runtime.js" });
await build({ ...common, entryPoints: ["src/runtime/freeform-bridge.ts"], outfile: ".runtime/freeform-bridge.js" });
console.log("runtime built → .runtime/");
