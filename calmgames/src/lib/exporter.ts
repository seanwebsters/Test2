import "server-only";
import JSZip from "jszip";
import { compileGame } from "./engine/compile";
import type { Asset, Game, GameVersion } from "./types";

/** A portable, offline HTML5 bundle: open index.html in any modern browser. */
export async function exportBundle(game: Game, version: GameVersion, assets: Asset[]): Promise<Buffer> {
  if (!version.build) throw new Error("This version has no playable build.");
  const emblem = assets.find((a) => a.id === version.assetIds[0]);
  const zip = new JSZip();
  const folder = zip.folder(slug(game.name))!;
  folder.file("index.html", compileGame(version.build, { emblemSvg: emblem?.kind === "svg" ? emblem.data : undefined }));
  folder.file("game.json", JSON.stringify({ name: game.name, version: version.number, build: version.build, specs: version.specs, qa: version.qa ?? null, exportedAt: new Date().toISOString() }, null, 2));
  for (const a of assets.filter((x) => version.assetIds.includes(x.id) && x.kind === "svg")) folder.file(`assets/${slug(a.name)}.svg`, a.data);
  folder.file(
    "README.txt",
    `${game.name} (version ${version.number})\n\n${game.description}\n\nOpen index.html in a browser to play. Everything is inline: the game needs no server or network.\nmode: ${version.build.mode}\nQA: ${version.qa ? (version.qa.passed ? "passed automated checks" : version.qa.ran ? "did not pass every automated check" : "not run") : "not run"}\n\nMade with Calm AI Game Studio.\n`,
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export const slug = (s: string) => s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game";
