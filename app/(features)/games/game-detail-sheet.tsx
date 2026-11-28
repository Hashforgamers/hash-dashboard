"use client"
import { useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Clock, Loader2, Plus, Star, Tag, Trash2, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  formatRupees, gameGenres, platformKey, platformLabel, sortPlatformKeys, stationLabel,
  type LibraryConsole, type StationName, type VendorGame,
} from "./library"
import { platformIcon } from "./platform-icon"
import { GameCover } from "./game-cover"
import styles from "./games.module.css"

/** Right-side sheet (full width on phones) with the game's details and the stations it is installed on. */
export function GameDetailSheet({
  vg, names, onClose, onRemove, onAddStations,
}: {
  vg: VendorGame | null
  names: Map<number, StationName>
  onClose: () => void
  onRemove: (console: LibraryConsole) => Promise<boolean>
  onAddStations: () => void
}) {
  return (
    <DialogPrimitive.Root open={!!vg} onOpenChange={open => { if (!open) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[31000] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn("dashboard-module fixed inset-y-0 right-0 z-[31001] flex w-full flex-col border-l border-border bg-card shadow-[0_24px_64px_rgba(0,0,0,0.5)] outline-none sm:max-w-[440px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-200 data-[state=open]:duration-300")}
        >
          {vg && <SheetBody vg={vg} names={names} onRemove={onRemove} onAddStations={onAddStations} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function SheetBody({ vg, names, onRemove, onAddStations }: {
  vg: VendorGame; names: Map<number, StationName>; onRemove: (console: LibraryConsole) => Promise<boolean>; onAddStations: () => void
}) {
  const { game } = vg
  const [removing, setRemoving] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const rating = Number(game.rawg_rating)
  const genres = gameGenres(game)
  const description = String(game.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  // Group rows by platform, stations in label order.
  const rows = [...vg.consoles]
    .map(c => ({ c, key: platformKey(c.console_type), label: stationLabel(c, names) }))
    .sort((a, b) => a.label.code.localeCompare(b.label.code, undefined, { numeric: true }))
  const groups = sortPlatformKeys(rows.map(r => r.key)).map(key => ({ key, rows: rows.filter(r => r.key === key) }))

  const remove = async (c: LibraryConsole) => {
    setRemoving(c.vendor_game_id)
    try { await onRemove(c) } finally { setRemoving(null) }
  }

  return (
    <>
      <div className={styles.sheetHero}>
        <GameCover name={game.name} src={game.image_url} size="lg" />
        <span aria-hidden className={styles.sheetScrim} />
        <DialogPrimitive.Close className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" /><span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        <div className="absolute inset-x-0 bottom-0 p-5">
          <DialogPrimitive.Title className="text-2xl font-semibold leading-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.5)]">{game.name}</DialogPrimitive.Title>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {genres.map(g => <span key={g} className={styles.glass}>{g}</span>)}
            {Number.isFinite(rating) && rating > 0 && <span className={styles.glass}><Star className={styles.starIcon} />{rating.toFixed(1)}</span>}
            {game.multiplayer && <span className={styles.glass}><Users className={styles.badgeIcon} />Multiplayer</span>}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
        {description ? (
          <DialogPrimitive.Description asChild>
            <div className="text-sm leading-relaxed text-muted-foreground">
              <p className={cn(!expanded && "line-clamp-4")}>{description}</p>
              {description.length > 240 && (
                <button type="button" onClick={() => setExpanded(v => !v)} className="mt-1 text-xs font-medium text-primary hover:underline">
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          </DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">Stations that have {game.name}</DialogPrimitive.Description>
        )}

        <div className="mt-5 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Available on</h3>
          <span className="text-xs tabular-nums text-muted-foreground">{vg.consoles.length} station{vg.consoles.length === 1 ? "" : "s"}</span>
        </div>

        <div className="mt-2 space-y-4">
          {groups.map(group => {
            const Icon = platformIcon(group.key)
            return (
              <section key={group.key} aria-label={platformLabel(group.key, false)}>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Icon aria-hidden className="h-3.5 w-3.5" />{platformLabel(group.key, false)}
                </p>
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {group.rows.map(({ c, label }) => (
                    <li key={c.vendor_game_id} className="flex items-center gap-3 bg-muted/20 px-3 py-2.5">
                      <span className="grid h-9 min-w-[3.25rem] place-items-center rounded-md border border-border bg-card px-1.5 text-[13px] font-semibold tabular-nums text-foreground">
                        {label.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{label.name && label.name !== label.code ? label.name : [c.brand, c.model_number].filter(Boolean).join(" ") || platformLabel(group.key, false)}</p>
                        <PriceLine c={c} />
                      </div>
                      <button type="button" onClick={() => remove(c)} disabled={removing !== null}
                        aria-label={`Remove ${game.name} from ${label.code}`} title={`Remove from ${label.code}`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:opacity-50">
                        {removing === c.vendor_game_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>

      <div className="border-t border-border p-4">
        <Button type="button" className="w-full gap-2" onClick={onAddStations}><Plus className="h-4 w-4" />Add to more stations</Button>
      </div>
    </>
  )
}

function PriceLine({ c }: { c: LibraryConsole }) {
  if (!c.is_offer) {
    return <p className="text-xs tabular-nums text-muted-foreground">{formatRupees(c.price_per_hour)}/hr</p>
  }
  const discount = Number(c.discount_percentage)
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums">
      <span className="font-semibold text-amber-300">{formatRupees(c.price_per_hour)}/hr</span>
      {Number(c.default_price) > 0 && <span className="text-muted-foreground line-through">{formatRupees(c.default_price)}</span>}
      <span className="inline-flex items-center gap-1 text-amber-300/90">
        <Tag aria-hidden className="h-3 w-3" />{c.offer_name || "Offer"}{Number.isFinite(discount) && discount > 0 ? ` · ${Math.round(discount)}% off` : ""}
      </span>
      {c.valid_until && <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock aria-hidden className="h-3 w-3" />till {formatValidUntil(c.valid_until)}</span>}
    </p>
  )
}

/** "2026-12-05 23:59" → "5 Dec, 23:59". */
function formatValidUntil(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/.exec(value)
  if (!m) return value
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2]) - 1] || m[2]
  return `${Number(m[3])} ${month}${m[4] ? `, ${m[4]}` : ""}`
}
