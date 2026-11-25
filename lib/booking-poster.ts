import { drawQr, encodeQr } from "@/lib/qr-code";

/** Public website that hosts each cafe's booking page. */
export const WEBSITE_URL = (process.env.NEXT_PUBLIC_WEBSITE_URL || "https://www.hashforgamers.com").replace(/\/+$/, "");

/**
 * The stable per-cafe URL. The website permanently redirects /book/<vendor_id> to its
 * SEO URL /book/<cafe-name>-<locality>-<vendor_id>, keeping the query string.
 */
export function cafeBookingUrl(vendorId: number | string, source?: { utm_source: string; utm_medium: string }): string {
  const url = `${WEBSITE_URL}/book/${encodeURIComponent(String(vendorId))}`;
  if (!source) return url;
  return `${url}?${new URLSearchParams(source).toString()}`;
}

export const QR_SOURCE = { utm_source: "dashboard_qr", utm_medium: "qr" };
export const SHARE_SOURCE = { utm_source: "dashboard_link", utm_medium: "share" };

const FONT = `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
const INK = "#0b0b0f";
const MUTED = "#55556a";
const GREEN = "#138a13";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Splits text into at most maxLines lines that fit width, shrinking the font until they do. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, minPx: number, maxLines: number, weight = 800, family = FONT) {
  for (let px = startPx; px >= minPx; px -= 4) {
    ctx.font = `${weight} ${px}px ${family}`;
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !line) line = next;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxWidth)) return { px, lines };
  }
  ctx.font = `${weight} ${minPx}px ${family}`;
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) clipped = clipped.slice(0, -1);
  return { px: minPx, lines: [clipped === text ? text : `${clipped}…`] };
}

/** A plain QR image (with quiet zone) for sharing or using in the cafe's own designs. */
export function renderQrCanvas(url: string, sizePx = 1024): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext("2d")!;
  drawQr(ctx, encodeQr(url, "Q"), 0, 0, sizePx);
  return canvas;
}

export type PosterStyle = "gaming" | "ink-saver";

interface PosterInput { cafeName: string; qrUrl: string; displayUrl: string }

/** An A4 portrait poster (150 dpi) with Hash branding, the cafe name and the booking QR. */
export async function renderPosterCanvas(input: PosterInput, style: PosterStyle = "gaming"): Promise<HTMLCanvasElement> {
  return style === "ink-saver" ? renderInkSaverPoster(input) : renderGamingPoster(input);
}

// Same type and colours as hashforgamers.com: Anton headlines, Orbitron labels, pink-orange-yellow gradient on black.
const ANTON = `"HashPosterAnton", Impact, "Arial Narrow", sans-serif`;
const ORBITRON = `"HashPosterOrbitron", ${FONT}`;
const GRADIENT = ["#ff3d8b", "#ff9a3d", "#ffd23d"];

let fontsReady: Promise<void> | null = null;
function loadPosterFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      if (typeof FontFace === "undefined") return;
      const faces = [
        new FontFace("HashPosterAnton", "url(/fonts/poster/anton.woff2)"),
        new FontFace("HashPosterOrbitron", "url(/fonts/poster/orbitron.woff2)"),
      ];
      await Promise.all(faces.map(async (face) => {
        try { document.fonts.add(await face.load()); } catch { /* falls back to Impact / system font */ }
      }));
    })();
  }
  return fontsReady;
}

function gradientAcross(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, GRADIENT[0]);
  g.addColorStop(0.55, GRADIENT[1]);
  g.addColorStop(1, GRADIENT[2]);
  return g;
}

function spacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacingPx: number, align: "left" | "center" | "right" = "left") {
  const chars = Array.from(text);
  const width = chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + spacingPx * (chars.length - 1);
  let cx = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c) => { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacingPx; });
  ctx.textAlign = prev;
  return width;
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

async function renderGamingPoster({ cafeName, qrUrl, displayUrl }: PosterInput): Promise<HTMLCanvasElement> {
  const W = 1240, H = 1754, M = 90;
  await loadPosterFonts();
  const logo = await loadImage("/poster/hash-logo.png");
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background: black with the site's pink/orange glows and a faint grid.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W - 40, 140, 760, GRADIENT[0], 0.42);
  glow(ctx, 60, H - 260, 720, GRADIENT[1], 0.28);
  glow(ctx, W / 2, 1120, 560, GRADIENT[0], 0.22);
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 62) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); ctx.stroke(); }
  for (let gy = 0; gy <= H; gy += 62) { ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke(); }

  // Top bar: logo, kicker, site.
  ctx.textBaseline = "middle";
  if (logo) ctx.drawImage(logo, M - 10, 62, 132, 132);
  ctx.fillStyle = "#cfcfcf";
  ctx.font = `600 24px ${ORBITRON}`;
  spacedText(ctx, "BOOK ON HASH", W - M, 128, 9, "right");

  // Headline
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `400 168px ${ANTON}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("SCAN. BOOK.", M, 400);
  const lineTwo = "GAME ON.";
  ctx.fillStyle = gradientAcross(ctx, M, M + ctx.measureText(lineTwo).width);
  ctx.fillText(lineTwo, M, 400 + 162);

  // Gradient bar + cafe name
  ctx.fillStyle = gradientAcross(ctx, M, M + 170);
  roundRect(ctx, M, 610, 170, 10, 5);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  const name = fitText(ctx, (cafeName.trim() || "Our Café").toUpperCase(), W - 2 * M, 84, 46, 2, 400, ANTON);
  ctx.font = `400 ${name.px}px ${ANTON}`;
  let y = 640 + name.px;
  name.lines.forEach((line, i) => { ctx.fillText(line, M, y); if (i < name.lines.length - 1) y += name.px * 1.14; });

  // QR card: white so every phone scans it, with a gradient rim and pink glow.
  const below = 330;
  const qrTop = Math.max(y + 130, 900);
  const qrSize = Math.max(520, Math.min(600, H - below - qrTop));
  const cardPad = 30;
  const cardX = W - M - qrSize - cardPad * 2, cardY = qrTop - cardPad, cardW = qrSize + cardPad * 2;
  ctx.save();
  ctx.shadowColor = "rgba(255,61,139,0.55)";
  ctx.shadowBlur = 70;
  ctx.fillStyle = gradientAcross(ctx, cardX, cardX + cardW);
  roundRect(ctx, cardX - 8, cardY - 8, cardW + 16, cardW + 16, 44);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardW, 36);
  ctx.fill();
  drawQr(ctx, encodeQr(qrUrl, "Q"), cardX + cardPad, qrTop, qrSize, 1);

  // Steps, left of the QR
  const stepsX = M;
  const steps: [string, string, string][] = [
    ["01", "Scan the code", "Phone camera or Google Lens"],
    ["02", "Log in", "With Google or Apple"],
    ["03", "Pick your slot", "Pay online or at the café"],
  ];
  const stepGap = (cardW - 20) / 3;
  steps.forEach(([num, title, sub], i) => {
    const sy = cardY + 92 + i * stepGap;
    ctx.font = `400 92px ${ANTON}`;
    ctx.fillStyle = gradientAcross(ctx, stepsX, stepsX + 110);
    ctx.fillText(num, stepsX, sy);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 38px ${FONT}`;
    ctx.fillText(title, stepsX, sy + 54);
    ctx.fillStyle = "#9a9a9a";
    ctx.font = `500 26px ${FONT}`;
    ctx.fillText(sub, stepsX, sy + 92);
  });

  // URL pill
  const pillY = cardY + cardW + 80;
  ctx.font = `700 34px ${FONT}`;
  const link = fitText(ctx, displayUrl, W - 2 * M - 80, 34, 22, 1, 700);
  ctx.font = `700 ${link.px}px ${FONT}`;
  const pillW = ctx.measureText(link.lines[0]).width + 80;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, M, pillY, pillW, 78, 39);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";
  ctx.fillText(link.lines[0], M + 40, pillY + 40);

  // Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "#6f6f6f";
  ctx.font = `600 18px ${ORBITRON}`;
  spacedText(ctx, "POWERED BY HASH FOR GAMERS", W / 2, H - 70, 6, "center");
  ctx.fillStyle = gradientAcross(ctx, 0, W);
  ctx.fillRect(0, H - 14, W, 14);
  ctx.textBaseline = "alphabetic";
  return canvas;
}

/** Light A4 version that uses little ink. */
async function renderInkSaverPoster({ cafeName, qrUrl, displayUrl }: PosterInput): Promise<HTMLCanvasElement> {
  const W = 1240, H = 1754;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Frame
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  roundRect(ctx, 40, 40, W - 80, H - 80, 36);
  ctx.stroke();
  ctx.fillStyle = GREEN;
  ctx.fillRect(40 + 36, 40 - 5, W - 80 - 72, 10);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Logo
  const logo = await loadImage("/blackhashlogo2.png");
  if (logo) ctx.drawImage(logo, W / 2 - 110, 70, 220, 220);

  // Headline
  ctx.fillStyle = GREEN;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText("BOOK YOUR GAMING SLOT ONLINE", W / 2, 340);

  // Cafe name
  ctx.fillStyle = INK;
  const name = fitText(ctx, cafeName.trim() || "Our Café", W - 220, 92, 48, 2);
  ctx.font = `800 ${name.px}px ${FONT}`;
  let y = 340 + 40 + name.px;
  name.lines.forEach((line) => { ctx.fillText(line, W / 2, y); y += name.px * 1.15; });

  // QR card
  // The QR shrinks (down to ~11 cm on A4) when a long cafe name takes two lines.
  const qrTop = Math.max(y + 10, 560);
  const textBelowQr = 24 + 84 + 70 + 64;
  const qrSize = Math.max(640, Math.min(720, H - 150 - textBelowQr - qrTop));
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  roundRect(ctx, W / 2 - qrSize / 2 - 24, qrTop - 24, qrSize + 48, qrSize + 48, 28);
  ctx.stroke();
  drawQr(ctx, encodeQr(qrUrl, "Q"), W / 2 - qrSize / 2, qrTop, qrSize, 2);

  // Call to action
  let ty = qrTop + qrSize + 24 + 84;
  ctx.fillStyle = INK;
  ctx.font = `800 52px ${FONT}`;
  ctx.fillText("Scan with your phone camera", W / 2, ty);

  ty += 70;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillStyle = MUTED;
  const steps = ["1  Scan", "2  Log in with Google or Apple", "3  Pick a slot and play"];
  const gap = 46;
  const widths = steps.map((s) => ctx.measureText(s).width);
  let sx = W / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (steps.length - 1)) / 2;
  ctx.textAlign = "left";
  steps.forEach((s, i) => {
    const [num, ...rest] = s.split("  ");
    ctx.fillStyle = GREEN;
    ctx.font = `800 32px ${FONT}`;
    ctx.fillText(num, sx, ty);
    const nw = ctx.measureText(`${num} `).width;
    ctx.fillStyle = MUTED;
    ctx.font = `500 32px ${FONT}`;
    ctx.fillText(` ${rest.join(" ")}`, sx + nw - 6, ty);
    sx += widths[i] + gap;
  });
  ctx.textAlign = "center";

  // Link for people who can't scan
  ty += 64;
  ctx.fillStyle = INK;
  const link = fitText(ctx, displayUrl, W - 240, 34, 22, 1, 600);
  ctx.font = `600 ${link.px}px ${FONT}`;
  ctx.fillText(link.lines[0], W / 2, ty);

  // Footer
  ctx.fillStyle = MUTED;
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText("Powered by Hash for Gamers", W / 2, H - 80);

  return canvas;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Wraps a canvas as a one-page A4 PDF (JPEG image), without a PDF library. */
export function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const jpeg = base64ToBytes(canvas.toDataURL("image/jpeg", 0.95).split(",")[1]);
  const pageW = 595.28, pageH = 841.89;
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const obj = (body: () => void) => { offsets.push(length); body(); };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(() => push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"));
  obj(() => push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"));
  obj(() => push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`));
  obj(() => {
    push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg);
    push("\nendstream\nendobj\n");
  });
  obj(() => push(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`));
  const xref = length;
  push(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  push(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => { out.set(part, offset); offset += part.length; });
  return new Blob([out], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image"))), "image/png"));
}

/** Prints the poster from a hidden iframe so no popup is needed. */
export function printCanvas(canvas: HTMLCanvasElement, title: string) {
  const dataUrl = canvas.toDataURL("image/png");
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentWindow!.document;
  doc.open();
  doc.write(`<!doctype html><html><head><title>${title.replace(/[<>&"]/g, "")}</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}img{display:block;width:210mm;height:297mm;object-fit:contain}</style></head><body><img alt="" src="${dataUrl}"></body></html>`);
  doc.close();
  const img = doc.querySelector("img")!;
  const go = () => {
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    window.setTimeout(() => frame.remove(), 60000);
  };
  if (img.complete) go(); else img.onload = go;
}

export function fileSafeName(name: string): string {
  return (name || "cafe").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "cafe";
}
