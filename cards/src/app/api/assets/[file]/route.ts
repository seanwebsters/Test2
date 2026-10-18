import fs from "node:fs";
import path from "node:path";

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(file)) return new Response("Not found", { status: 404 });
  const p = path.resolve(process.cwd(), process.env.DATA_DIR || ".data", "uploads", file);
  if (!fs.existsSync(p)) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(p), { headers: { "content-type": MIME[file.split(".")[1]!]!, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
}
