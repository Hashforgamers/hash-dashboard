"use client"
import { ArrowDownUp, ChevronDown, Grid2x2, Grid3x3, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SORT_OPTIONS, hasFilters, platformLabel, type Density, type Facet, type LibraryFilters, type SortKey } from "./library"
import { platformIcon } from "./platform-icon"
import styles from "./games.module.css"

const TOP_GENRES = 6

function Chip({ active, onClick, children, count, className }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number; className?: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground", className)}>
      {children}
      {count !== undefined && <span className="tabular-nums opacity-70">{count}</span>}
    </button>
  )
}

/** Sticky toolbar: title search, platform and genre chips, active filter pills, sort and density. */
export function GameFilters({
  filters, onChange, platforms, genres, sort, onSort, density, onDensity, total, shown,
}: {
  filters: LibraryFilters
  onChange: (next: LibraryFilters) => void
  platforms: Facet[]
  genres: Facet[]
  sort: SortKey
  onSort: (sort: SortKey) => void
  density: Density
  onDensity: (density: Density) => void
  total: number
  shown: number
}) {
  const toggle = (group: "platforms" | "genres", key: string) => {
    const list = filters[group]
    onChange({ ...filters, [group]: list.includes(key) ? list.filter(k => k !== key) : [...list, key] })
  }
  // Keep a picked genre visible even when it is outside the top few.
  const topGenres = genres.slice(0, TOP_GENRES)
  const moreGenres = genres.slice(TOP_GENRES)
  const pickedInMore = moreGenres.filter(g => filters.genres.includes(g.key))
  const genreLabel = (key: string) => genres.find(g => g.key === key)?.label || key
  const active = hasFilters(filters)

  return (
    <div className={styles.toolbar}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <span className="sr-only">Search your games</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" role="searchbox" enterKeyHint="search" value={filters.query} placeholder="Search your games"
            onChange={e => onChange({ ...filters, query: e.target.value })} style={{ paddingLeft: 36, paddingRight: 32 }}
            className="dashboard-module-input h-9 w-full rounded-lg pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          {filters.query && (
            <button type="button" aria-label="Clear search" onClick={() => onChange({ ...filters, query: "" })}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>

        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <Select value={sort} onValueChange={v => onSort(v as SortKey)}>
            <SelectTrigger aria-label="Sort games" className="h-9 flex-1 gap-2 sm:w-[180px] sm:flex-none rounded-lg border-border bg-card text-sm">
              <ArrowDownUp aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="inline-flex h-9 items-center rounded-lg border border-border bg-card p-0.5" role="radiogroup" aria-label="Grid density">
            {([["comfortable", Grid2x2, "Comfortable"], ["compact", Grid3x3, "Compact"]] as const).map(([value, Icon, label]) => (
              <button key={value} type="button" role="radio" aria-checked={density === value} aria-label={label} title={label}
                onClick={() => onDensity(value)}
                className={cn("grid h-8 w-8 place-items-center rounded-md transition-colors",
                  density === value ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.chipRow}>
        {platforms.length > 1 && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Platform">
            <Chip active={filters.platforms.length === 0} onClick={() => onChange({ ...filters, platforms: [] })} count={total}>All</Chip>
            {platforms.map(p => {
              const Icon = platformIcon(p.key)
              return (
                <Chip key={p.key} active={filters.platforms.includes(p.key)} onClick={() => toggle("platforms", p.key)} count={p.count}>
                  <Icon aria-hidden className="h-3.5 w-3.5" />{p.label}
                </Chip>
              )
            })}
          </div>
        )}
        {platforms.length > 1 && genres.length > 0 && <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />}
        {genres.length > 0 && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Genre">
            {[...topGenres, ...pickedInMore].map(g => (
              <Chip key={g.key} active={filters.genres.includes(g.key)} onClick={() => toggle("genres", g.key)} count={g.count}>{g.label}</Chip>
            ))}
            {moreGenres.length > pickedInMore.length && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 text-xs font-medium text-muted-foreground hover:text-foreground">
                    More<ChevronDown aria-hidden className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-2">
                  <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">More genres</p>
                  <div className="flex flex-wrap gap-1.5">
                    {moreGenres.filter(g => !filters.genres.includes(g.key)).map(g => (
                      <Chip key={g.key} active={false} onClick={() => toggle("genres", g.key)} count={g.count}>{g.label}</Chip>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs" aria-live="polite">
          <span className="mr-1 text-muted-foreground"><span className="font-semibold tabular-nums text-foreground">{shown}</span> of {total} games</span>
          {filters.query.trim() && (
            <ActivePill label={`“${filters.query.trim()}”`} onRemove={() => onChange({ ...filters, query: "" })} />
          )}
          {filters.platforms.map(key => <ActivePill key={key} label={platformLabel(key)} onRemove={() => toggle("platforms", key)} />)}
          {filters.genres.map(key => <ActivePill key={key} label={genreLabel(key)} onRemove={() => toggle("genres", key)} />)}
          <button type="button" onClick={() => onChange({ query: "", platforms: [], genres: [] })}
            className="ml-1 font-medium text-primary underline-offset-4 hover:underline">Clear all</button>
        </div>
      )}
    </div>
  )
}

function ActivePill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-muted/40 pl-2 pr-1 text-foreground">
      {label}
      <button type="button" aria-label={`Remove filter ${label}`} onClick={onRemove}
        className="grid h-4 w-4 place-items-center rounded text-muted-foreground hover:text-foreground">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
