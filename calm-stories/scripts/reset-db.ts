/** Deletes the local JSON database and blob cache so the seed is rebuilt on next start. */
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.cwd(), process.env.DATA_DIR ?? ".data");
fs.rmSync(path.join(dir, "db.json"), { force: true });
console.log(`Reset ${dir}/db.json — it will be re-seeded on next request.`);
