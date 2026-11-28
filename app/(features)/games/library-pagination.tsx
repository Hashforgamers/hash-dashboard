"use client"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { pageWindow } from "./library"

/** Prev / page numbers / next; renders nothing for a single page. */
export function LibraryPagination({ page, pages, total, perPage, onPage }: { page: number; pages: number; total: number; perPage: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null
  const from = (page - 1) * perPage + 1
  const to = Math.min(total, page * perPage)
  const btn = "grid h-8 min-w-8 place-items-center rounded-lg border px-2 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40"
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-xs tabular-nums text-muted-foreground">{from}–{to} of {total}</p>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className={cn(btn, "border-border bg-card text-muted-foreground hover:text-foreground")}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageWindow(page, pages).map((p, i) => p === "gap"
          ? <span key={`gap-${i}`} aria-hidden className="px-1 text-xs text-muted-foreground">…</span>
          : (
            <button key={p} type="button" aria-current={p === page ? "page" : undefined} aria-label={`Page ${p}`} onClick={() => onPage(p)}
              className={cn(btn, p === page ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground")}>
              {p}
            </button>
          ))}
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} className={cn(btn, "border-border bg-card text-muted-foreground hover:text-foreground")}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  )
}
