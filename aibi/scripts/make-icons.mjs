// Renders PWA / social icons from public/icons/icon.svg. Run: npm run icons
import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/icons/icon.svg");
const out = (n) => `public/icons/${n}`;
await sharp(svg).resize(192, 192).png().toFile(out("icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(out("icon-512.png"));
await sharp(svg).resize(180, 180).png().toFile(out("apple-touch-icon.png"));
// Maskable: add safe-zone padding on the brand colour.
const inner = await sharp(svg).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#7C4DFF" } }).composite([{ input: inner, top: 56, left: 56 }]).png().toFile(out("maskable-512.png"));
// Open Graph image
const og = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#43209C"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><text x="80" y="250" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="700" font-size="110" fill="#fff">AIBI</text><text x="80" y="360" font-family="Arial, sans-serif" font-weight="700" font-size="58" fill="#fff">Learn AI. A little every day.</text><text x="80" y="430" font-family="Arial, sans-serif" font-size="34" fill="#E8E1FF">Fun, five-minute lessons for everyone.</text></svg>`);
const logo = await sharp(svg).resize(360, 360).png().toBuffer();
await sharp(og).composite([{ input: logo, top: 135, left: 780 }]).png().toFile(out("og.png"));
console.log("icons written");
