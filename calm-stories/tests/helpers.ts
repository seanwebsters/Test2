import { LocalDatabase } from "@/lib/db/local";
import { setDb } from "@/lib/db";
import { setStore, LocalBlobStore } from "@/lib/storage";
import { buildSeedSnapshot } from "@/lib/seed/build";
import { loadViewer } from "@/lib/auth";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const NOW = new Date("2026-10-14T12:00:00Z");

/** Fresh in-memory database + temp blob store per test. */
export function freshDb() {
  const db = new LocalDatabase(buildSeedSnapshot(new Date()));
  setDb(db);
  setStore(new LocalBlobStore(fs.mkdtempSync(path.join(os.tmpdir(), "calm-blobs-"))));
  return db;
}

export const viewers = {
  visitor: () => loadViewer(null),
  free: () => loadViewer("user-sam"),
  listener: () => loadViewer("user-ada"),
  creator: () => loadViewer("user-juniper-vale"),
  otherCreator: () => loadViewer("user-theo-okafor"),
  admin: () => loadViewer("user-calm-editor"),
};
