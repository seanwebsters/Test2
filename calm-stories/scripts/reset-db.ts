/** Deletes the local JSON database and generated media so the next start re-seeds. */
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.env.DATA_DIR ?? ".data");
fs.rmSync(dir, { recursive: true, force: true });
console.log(`Removed ${dir}. Restart the dev server to re-seed.`);
