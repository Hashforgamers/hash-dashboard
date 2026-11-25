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
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, minPx: number, maxLines: number, weight = 800) {
  for (let px = startPx; px >= minPx; px -= 4) {
    ctx.font = `${weight} ${px}px ${FONT}`;
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
  ctx.font = `${weight} ${minPx}px ${FONT}`;
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

/** An A4 portrait poster (150 dpi) with Hash branding, the cafe name and the booking QR. */
export async function renderPosterCanvas({ cafeName, qrUrl, displayUrl }: { cafeName: string; qrUrl: string; displayUrl: string }): Promise<HTMLCanvasElement> {
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
