"use client";

import { useStore } from "./store";

// Generates beautiful, branded PNG cards on a canvas, then shares them with the
// native share sheet (mobile) or downloads them (desktop). No server needed.

export interface CardSpec {
  eyebrow: string;
  title: string;
  subtitle?: string;
  badge: string; // emoji
  stat?: { value: string; label: string };
  accent?: string;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws Aibi's head with canvas primitives so cards don't depend on image loading. */
function drawMascot(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  const purple = ctx.createLinearGradient(0, -60, 0, 60);
  purple.addColorStop(0, "#B79BFF");
  purple.addColorStop(1, "#6233D6");
  ctx.fillStyle = purple;
  ctx.beginPath();
  ctx.ellipse(-66, 0, 14, 22, 0, 0, Math.PI * 2);
  ctx.ellipse(66, 0, 14, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#C9B8FF";
  rr(ctx, -3, -78, 6, 22, 3);
  ctx.fill();
  ctx.fillStyle = purple;
  ctx.beginPath();
  ctx.arc(0, -80, 10, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createRadialGradient(-20, -30, 10, 0, 0, 90);
  body.addColorStop(0, "#FFFFFF");
  body.addColorStop(0.6, "#F1ECFF");
  body.addColorStop(1, "#C9B8FF");
  ctx.fillStyle = body;
  rr(ctx, -64, -58, 128, 108, 48);
  ctx.fill();
  const visor = ctx.createLinearGradient(0, -40, 0, 34);
  visor.addColorStop(0, "#3B2A6B");
  visor.addColorStop(1, "#140C2E");
  ctx.fillStyle = visor;
  rr(ctx, -50, -40, 100, 72, 34);
  ctx.fill();
  ctx.strokeStyle = "#D9CBFF";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-34, -2);
  ctx.quadraticCurveTo(-23, -16, -12, -2);
  ctx.moveTo(12, -2);
  ctx.quadraticCurveTo(23, -16, 34, -2);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-10, 12);
  ctx.quadraticCurveTo(0, 22, 10, 12);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(-28, -52, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function renderCard(spec: CardSpec): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  await document.fonts?.ready;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#8B5CF6");
  bg.addColorStop(0.55, "#6A35F0");
  bg.addColorStop(1, "#43209C");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // soft orbs
  const orb = (x: number, y: number, r: number, col: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  orb(900, 160, 420, "rgba(255,111,181,0.45)");
  orb(120, 1150, 460, "rgba(79,178,255,0.35)");

  // logo
  ctx.fillStyle = "#fff";
  ctx.font = "600 64px 'Fredoka Variable', 'Nunito Variable', sans-serif";
  ctx.fillText("AIBI", 172, 136);
  drawMascot(ctx, 112, 116, 0.42);

  // card
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  rr(ctx, 80, 230, W - 160, 900, 64);
  ctx.fill();

  // badge
  const accent = spec.accent ?? "#7C4DFF";
  ctx.fillStyle = accent + "22";
  ctx.beginPath();
  ctx.arc(W / 2, 430, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(W / 2, 430, 108, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "120px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.badge, W / 2, 438);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#857BA3";
  ctx.font = "800 34px 'Nunito Variable', sans-serif";
  ctx.fillText(spec.eyebrow.toUpperCase(), W / 2, 640);

  ctx.fillStyle = "#1E1538";
  ctx.font = "600 76px 'Fredoka Variable', 'Nunito Variable', sans-serif";
  const tl = wrap(ctx, spec.title, W - 280);
  tl.slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 735 + i * 86));
  let y = 735 + Math.min(tl.length, 2) * 86;

  if (spec.subtitle) {
    ctx.fillStyle = "#4A3F6B";
    ctx.font = "600 38px 'Nunito Variable', sans-serif";
    const sl = wrap(ctx, spec.subtitle, W - 300);
    sl.slice(0, 3).forEach((l, i) => ctx.fillText(l, W / 2, y + 10 + i * 50));
    y += 10 + Math.min(sl.length, 3) * 50;
  }

  if (spec.stat) {
    ctx.fillStyle = "#F3EFFF";
    rr(ctx, W / 2 - 220, 960, 440, 130, 36);
    ctx.fill();
    ctx.fillStyle = "#6A35F0";
    ctx.font = "600 60px 'Fredoka Variable', sans-serif";
    ctx.fillText(spec.stat.value, W / 2, 1030);
    ctx.fillStyle = "#857BA3";
    ctx.font = "800 26px 'Nunito Variable', sans-serif";
    ctx.fillText(spec.stat.label.toUpperCase(), W / 2, 1070);
  }

  ctx.fillStyle = "#fff";
  ctx.font = "600 46px 'Fredoka Variable', sans-serif";
  ctx.fillText("Learn AI. A little every day.", W / 2, 1220);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "700 30px 'Nunito Variable', sans-serif";
  ctx.fillText(typeof location !== "undefined" ? location.host : "aibi", W / 2, 1275);

  return await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
}

export interface CertSpec {
  name: string;
  title: string;
  world: string;
  skills: string[];
  score: number;
  date: string;
  id: string;
}

export async function renderCertificate(spec: CertSpec): Promise<Blob> {
  const W = 1600;
  const H = 1130;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  await document.fonts?.ready;
  ctx.fillStyle = "#FBF9FF";
  ctx.fillRect(0, 0, W, H);
  const border = ctx.createLinearGradient(0, 0, W, H);
  border.addColorStop(0, "#8B5CF6");
  border.addColorStop(1, "#EC4899");
  ctx.strokeStyle = border;
  ctx.lineWidth = 28;
  rr(ctx, 40, 40, W - 80, H - 80, 48);
  ctx.stroke();
  ctx.strokeStyle = "#E3DBFF";
  ctx.lineWidth = 3;
  rr(ctx, 80, 80, W - 160, H - 160, 32);
  ctx.stroke();

  drawMascot(ctx, W / 2, 210, 0.75);
  ctx.textAlign = "center";
  ctx.fillStyle = "#6A35F0";
  ctx.font = "800 30px 'Nunito Variable', sans-serif";
  ctx.fillText("AIBI CERTIFICATE OF AI LITERACY", W / 2, 340);
  ctx.fillStyle = "#857BA3";
  ctx.font = "600 32px 'Nunito Variable', sans-serif";
  ctx.fillText("This certifies that", W / 2, 410);
  ctx.fillStyle = "#1E1538";
  ctx.font = "600 92px 'Fredoka Variable', sans-serif";
  ctx.fillText(spec.name, W / 2, 510);
  ctx.fillStyle = "#4A3F6B";
  ctx.font = "600 34px 'Nunito Variable', sans-serif";
  ctx.fillText("has demonstrated practical skills in", W / 2, 580);
  ctx.fillStyle = "#5726CC";
  ctx.font = "600 64px 'Fredoka Variable', sans-serif";
  ctx.fillText(spec.title, W / 2, 660);
  ctx.fillStyle = "#4A3F6B";
  ctx.font = "700 28px 'Nunito Variable', sans-serif";
  ctx.fillText(spec.skills.join("  ·  "), W / 2, 730);

  ctx.fillStyle = "#F3EFFF";
  rr(ctx, W / 2 - 170, 780, 340, 110, 30);
  ctx.fill();
  ctx.fillStyle = "#6A35F0";
  ctx.font = "600 52px 'Fredoka Variable', sans-serif";
  ctx.fillText(`${spec.score}%`, W / 2, 845);
  ctx.fillStyle = "#857BA3";
  ctx.font = "800 20px 'Nunito Variable', sans-serif";
  ctx.fillText("DEMONSTRATED ACCURACY", W / 2, 875);

  ctx.font = "700 24px 'Nunito Variable', sans-serif";
  ctx.fillStyle = "#857BA3";
  ctx.textAlign = "left";
  ctx.fillText(`Awarded ${spec.date}`, 150, 990);
  ctx.textAlign = "right";
  ctx.fillText(`Credential ID ${spec.id}`, W - 150, 990);
  return await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
}

export async function shareBlob(blob: Blob, filename: string, text: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text, title: "AIBI" });
      useStore.getState().recordShare();
      return "shared";
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "cancelled";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  useStore.getState().recordShare();
  return "downloaded";
}

export async function shareCard(spec: CardSpec, text: string) {
  const blob = await renderCard(spec);
  return shareBlob(blob, `aibi-${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`, text);
}

export async function shareText(text: string): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({ text, title: "AIBI" });
      useStore.getState().recordShare();
      return true;
    }
    await navigator.clipboard.writeText(text);
    useStore.getState().recordShare();
    return true;
  } catch {
    return false;
  }
}
