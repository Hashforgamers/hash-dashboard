"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, ExternalLink, FileText, Printer, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/app/context/AccessContext";
import { useDashboardData } from "@/app/context/DashboardDataContext";
import { encodeQr, qrSvgPath } from "@/lib/qr-code";
import {
  type PosterStyle,
  QR_SOURCE,
  SHARE_SOURCE,
  cafeBookingUrl,
  canvasToPdfBlob,
  canvasToPngBlob,
  downloadBlob,
  fileSafeName,
  printCanvas,
  renderPosterCanvas,
  renderQrCanvas,
} from "@/lib/booking-poster";

function readCafeName(vendorId: number | string | null): string {
  if (!vendorId) return "";
  try {
    const cafes = JSON.parse(localStorage.getItem("vendors") || "[]");
    const cafe = Array.isArray(cafes) ? cafes.find((c: any) => String(c?.id) === String(vendorId)) : null;
    return String(cafe?.cafe_name || "").trim();
  } catch {
    return "";
  }
}

/** Each cafe's shareable booking link and printable QR, pointing at its page on the Hash website. */
export function CafeBookingLink() {
  const { vendorId } = useDashboardData();
  const { selectedCafeId } = useAccess();
  const cafeId = vendorId ?? selectedCafeId ?? null;
  const [cafeName, setCafeName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [posterStyle, setPosterStyle] = useState<PosterStyle>("gaming");

  useEffect(() => setCafeName(readCafeName(cafeId)), [cafeId]);

  const link = cafeId ? cafeBookingUrl(cafeId) : "";
  const shareLink = cafeId ? cafeBookingUrl(cafeId, SHARE_SOURCE) : "";
  const qrLink = cafeId ? cafeBookingUrl(cafeId, QR_SOURCE) : "";
  const displayName = cafeName || (cafeId ? `Café #${cafeId}` : "");
  const qr = useMemo(() => (qrLink ? encodeQr(qrLink, "Q") : null), [qrLink]);
  const fileBase = `hash-booking-${fileSafeName(displayName)}`;

  if (!cafeId) {
    return <p className="text-sm text-muted-foreground">Select a café to see its booking link and QR.</p>;
  }

  const run = (key: string, task: () => Promise<void> | void) => async () => {
    if (busy) return;
    setBusy(key);
    try {
      await task();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const poster = () => renderPosterCanvas({ cafeName: displayName, qrUrl: qrLink, displayUrl: link.replace(/^https?:\/\//, "") }, posterStyle);

  const copyLink = run("copy", async () => {
    await navigator.clipboard.writeText(shareLink);
    toast.success("Booking link copied");
  });
  const shareNative = run("share", async () => {
    const text = `Book your gaming slot at ${displayName} on Hash`;
    if (navigator.share) {
      try {
        await navigator.share({ title: displayName, text, url: shareLink });
      } catch (error) {
        if ((error as DOMException)?.name !== "AbortError") throw error;
      }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}: ${shareLink}`)}`, "_blank", "noopener,noreferrer");
  });
  const downloadQrPng = run("qr", async () => downloadBlob(await canvasToPngBlob(renderQrCanvas(qrLink)), `${fileBase}-qr.png`));
  const downloadPosterPng = run("poster-png", async () => downloadBlob(await canvasToPngBlob(await poster()), `${fileBase}-poster.png`));
  const downloadPosterPdf = run("poster-pdf", async () => downloadBlob(canvasToPdfBlob(await poster()), `${fileBase}-poster.pdf`));
  const printPoster = run("print", async () => printCanvas(await poster(), `${displayName} booking QR`));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <section className="space-y-5 rounded-lg border p-5">
        <div>
          <h2 className="text-lg font-semibold">{displayName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers open this link or scan the QR, log in with Google or Apple, and book a slot on your Hash page.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="cafe-booking-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Booking link</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="cafe-booking-url"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={copyLink} disabled={busy === "copy"}><Copy className="mr-2 h-4 w-4" />Copy</Button>
              <Button type="button" variant="outline" onClick={shareNative} disabled={busy === "share"}><Share2 className="mr-2 h-4 w-4" />Share</Button>
              <Button type="button" variant="outline" asChild>
                <a href={link} target="_blank" rel="noopener noreferrer" aria-label="Open booking page"><ExternalLink className="h-4 w-4" /></a>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Put it in your Instagram bio, Google Business profile or WhatsApp status. The link never changes.</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Print and download</p>
          <div role="radiogroup" aria-label="Poster style" className="inline-flex rounded-md border p-0.5 text-sm">
            {([["gaming", "Gaming (dark)"], ["ink-saver", "Ink saver (white)"]] as [PosterStyle, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={posterStyle === value}
                onClick={() => setPosterStyle(value)}
                className={`rounded px-3 py-1 ${posterStyle === value ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={printPoster} disabled={!!busy}><Printer className="mr-2 h-4 w-4" />{busy === "print" ? "Preparing…" : "Print poster"}</Button>
            <Button type="button" variant="outline" onClick={downloadPosterPdf} disabled={!!busy}><FileText className="mr-2 h-4 w-4" />Poster PDF</Button>
            <Button type="button" variant="outline" onClick={downloadPosterPng} disabled={!!busy}><Download className="mr-2 h-4 w-4" />Poster PNG</Button>
            <Button type="button" variant="outline" onClick={downloadQrPng} disabled={!!busy}><QrCode className="mr-2 h-4 w-4" />QR only PNG</Button>
          </div>
          <p className="text-xs text-muted-foreground">The poster is A4 with your café name, in the Hash website's style. Use Ink saver for everyday office printers.</p>
        </div>
      </section>

      <section className="flex flex-col items-center rounded-lg border p-5">
        <div className="w-full max-w-[300px] rounded-lg bg-white p-3">
          {qr && (
            <svg viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`} role="img" aria-label={`QR code for ${link}`} className="block h-auto w-full" shapeRendering="crispEdges">
              <rect x={-2} y={-2} width={qr.size + 4} height={qr.size + 4} fill="#fff" />
              <path d={qrSvgPath(qr)} fill="#000" />
            </svg>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Scan with a phone camera to test it.</p>
      </section>
    </div>
  );
}
