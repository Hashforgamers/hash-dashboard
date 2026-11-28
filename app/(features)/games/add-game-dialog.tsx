"use client"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, Gamepad2, IndianRupee, Loader2, Monitor, Plus, Search, Star, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { DASHBOARD_URL } from "@/src/config/env"
import { compatiblePlatforms } from "./platforms"
import { formatRupees, gameGenres, platformKey, platformLabel, stationLabel, type Game, type StationName } from "./library"
import { platformIcon } from "./platform-icon"
import { GameCover } from "./game-cover"
import type { PlatformType } from "./use-game-library"
import styles from "./games.module.css"

/**
 * Two steps: pick a catalog game, then a console group and its stations.
 * Opened with `initialGame` it starts at step 2 ("Add to more stations").
 */
export function AddGameDialog({
  open, initialGame, onClose, platformTypes, names, installed, onAdd,
}: {
  open: boolean
  initialGame: Game | null
  onClose: () => void
  platformTypes: PlatformType[]
  names: Map<number, StationName>
  installed: Map<number, Set<number>> // game id -> console ids that already have it
  onAdd: (game: Game, consoleIds: number[]) => Promise<boolean>
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [allGames, setAllGames] = useState<Game[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedPlatformId, setSelectedPlatformId] = useState<number | null>(null)
  const [selectedConsoleIds, setSelectedConsoleIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Fresh state on every open.
  useEffect(() => {
    if (!open) return
    setStep(initialGame ? 2 : 1)
    setSelectedGame(initialGame)
    setSelectedPlatformId(null)
    setSelectedConsoleIds([])
    setSearchTerm("")
    setSearchError(null)
  }, [open, initialGame])

  // vendor-games rows carry no supported_platforms; read them from the catalog search for this title.
  const [resolving, setResolving] = useState(false)
  useEffect(() => {
    if (!open || !initialGame || initialGame.supported_platforms) return
    const abort = new AbortController()
    setResolving(true)
    fetch(`${DASHBOARD_URL}/games?search=${encodeURIComponent(initialGame.name)}`, { signal: abort.signal })
      .then(r => (r.ok ? r.json() : []))
      .then((data: Game[]) => {
        const match = Array.isArray(data) ? data.find(g => g.id === initialGame.id) : undefined
        if (match) setSelectedGame(match)
      })
      .catch(err => { if (err?.name !== "AbortError") console.error("Error loading game platforms:", err) })
      .finally(() => { if (!abort.signal.aborted) setResolving(false) })
    return () => abort.abort()
  }, [open, initialGame])

  // Debounced catalog search (GET /games?search=).
  useEffect(() => {
    if (!open || step !== 1) return
    const abort = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true)
        const url = searchTerm ? `${DASHBOARD_URL}/games?search=${encodeURIComponent(searchTerm)}` : `${DASHBOARD_URL}/games`
        const response = await fetch(url, { signal: abort.signal })
        if (!response.ok) throw new Error("Failed to fetch games")
        const data = await response.json()
        setAllGames(Array.isArray(data) ? data : [])
        setSearchError(null)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error("Error fetching games:", err)
        setSearchError("Failed to load games.")
      } finally {
        if (!abort.signal.aborted) setSearchLoading(false)
      }
    }, 300)
    return () => { abort.abort(); window.clearTimeout(timer) }
  }, [open, step, searchTerm])

  const eligible = useMemo(
    () => compatiblePlatforms(platformTypes, selectedGame?.supported_platforms),
    [platformTypes, selectedGame?.supported_platforms],
  )
  const have = (selectedGame && installed.get(selectedGame.id)) || new Set<number>()
  // One group only: pick it for them.
  useEffect(() => {
    if (step === 2 && selectedPlatformId === null && eligible.length === 1) setSelectedPlatformId(eligible[0].id)
  }, [step, eligible, selectedPlatformId])
  const platform = eligible.find(p => p.id === selectedPlatformId) || null
  const pickable = platform ? platform.consoles.filter(c => !have.has(c.id)) : []
  const sortedConsoles = platform
    ? [...platform.consoles].sort((a, b) => stationLabel(a, names).code.localeCompare(stationLabel(b, names).code, undefined, { numeric: true }))
    : []

  const choosePlatform = (id: number) => { setSelectedPlatformId(id); setSelectedConsoleIds([]) }
  const toggleConsole = (id: number) => setSelectedConsoleIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  const allPicked = pickable.length > 0 && pickable.every(c => selectedConsoleIds.includes(c.id))

  const submit = async () => {
    if (!selectedGame || !platform || selectedConsoleIds.length === 0) return
    if (selectedConsoleIds.some(id => !platform.consoles.some(c => c.id === id))) return
    setSubmitting(true)
    const ok = await onAdd(selectedGame, selectedConsoleIds)
    setSubmitting(false)
    if (ok) onClose()
  }

  const backToGames = () => { setStep(1); setSelectedGame(null); setSelectedPlatformId(null); setSelectedConsoleIds([]) }
  const n = selectedConsoleIds.length

  return (
    <Dialog open={open} onOpenChange={value => { if (!value && !submitting) onClose() }}>
      <DialogContent className="dashboard-module flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <div className="border-b border-border px-5 pb-4 pt-5">
          <div className="flex items-center gap-3 pr-8">
            {step === 2 && !initialGame && (
              <button type="button" onClick={backToGames} aria-label="Back to games"
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold text-foreground">{initialGame ? `Add ${initialGame.name} to stations` : "Add game"}</DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
                {step === 1 ? "Step 1 of 2 · Pick a game from the catalog" : initialGame ? "Choose the stations that should have it" : "Step 2 of 2 · Choose the stations"}
              </DialogDescription>
            </div>
          </div>
          {!initialGame && (
            <div className="mt-4 flex gap-1.5" aria-hidden>
              {[1, 2].map(s => <span key={s} className={cn("h-1 flex-1 rounded-full transition-colors", s <= step ? "bg-primary" : "bg-muted")} />)}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <>
              <label className="relative mb-4 block">
                <span className="sr-only">Search the game catalog</span>
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="search" autoFocus value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: 36, paddingRight: 36 }}
                  placeholder="Search games (e.g. GTA, Call of Duty)"
                  className="dashboard-module-input h-10 w-full rounded-lg pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                {searchLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </label>
              {searchError ? (
                <p className="py-12 text-center text-sm text-red-300">{searchError}</p>
              ) : !searchLoading && allGames.length === 0 ? (
                <div className="py-12 text-center">
                  <Gamepad2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">{searchTerm ? "No games found" : "No games available"}</p>
                </div>
              ) : (
                <ul className={styles.pickGrid}>
                  {allGames.map(game => {
                    const rating = Number(game.rawg_rating)
                    const inLibrary = installed.has(game.id)
                    return (
                      <li key={game.id}>
                        <button type="button" className={cn(styles.card, styles.cardCompact)} onClick={() => { setSelectedGame(game); setSelectedPlatformId(null); setSelectedConsoleIds([]); setStep(2) }}
                          aria-label={`${game.name}${inLibrary ? ", already in your library" : ""}`}>
                          <span className={styles.art}><GameCover name={game.name} src={game.image_url} /></span>
                          <span aria-hidden className={styles.scrim} />
                          {inLibrary && <span className={cn(styles.glass, styles.badges)}><Check className={styles.badgeIcon} />In library</span>}
                          {Number.isFinite(rating) && rating > 0 && <span className={cn(styles.glass, styles.rating)}><Star className={styles.starIcon} />{rating.toFixed(1)}</span>}
                          <span className={styles.caption}>
                            <span className={styles.title}>{game.name}</span>
                            {gameGenres(game)[0] && <span className={styles.genre}>{gameGenres(game)[0]}</span>}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}

          {step === 2 && selectedGame && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-3">
                <span className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md"><GameCover name={selectedGame.name} src={selectedGame.image_url} size="sm" /></span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{selectedGame.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {gameGenres(selectedGame).map(g => <span key={g} className="rounded-md border border-border px-1.5 py-0.5">{g}</span>)}
                    {Number(selectedGame.rawg_rating) > 0 && <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5"><Star className="h-3 w-3 text-amber-300" />{Number(selectedGame.rawg_rating).toFixed(1)}</span>}
                    {selectedGame.multiplayer && <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5"><Users className="h-3 w-3" />Multiplayer</span>}
                  </div>
                </div>
              </div>

              {resolving ? (
                <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading stations…</p>
              ) : eligible.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-10 text-center">
                  <Monitor className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">No compatible stations for this game. Check its catalog platforms and your café’s console setup.</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">Console group</p>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Console group">
                      {eligible.map(p => {
                        const key = platformKey(p.consoles[0]?.console_type || p.platform_type)
                        const Icon = platformIcon(key)
                        const active = p.id === selectedPlatformId
                        return (
                          <button key={p.id} type="button" role="radio" aria-checked={active} onClick={() => choosePlatform(p.id)}
                            className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                              active ? "border-primary bg-primary/15 ring-2 ring-primary/40" : "border-border bg-card hover:border-primary/50")}>
                            <Icon aria-hidden className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                            <span>
                              <span className="block text-sm font-semibold text-foreground">{p.platform_type || platformLabel(key, false)}</span>
                              <span className="block text-xs tabular-nums text-muted-foreground">{p.total_consoles} station{p.total_consoles === 1 ? "" : "s"} · {formatRupees(p.single_slot_price)}/slot</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {platform && (
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">Stations</p>
                        {pickable.length > 1 && (
                          <button type="button" className="text-xs font-medium text-primary hover:underline"
                            onClick={() => setSelectedConsoleIds(allPicked ? [] : pickable.map(c => c.id))}>
                            {allPicked ? "Clear selection" : `Select all ${pickable.length}`}
                          </button>
                        )}
                      </div>
                      <div className={styles.stationGrid}>
                        {sortedConsoles.map(c => {
                          const label = stationLabel(c, names)
                          const already = have.has(c.id)
                          const picked = selectedConsoleIds.includes(c.id)
                          const Icon = platformIcon(platformKey(c.console_type))
                          return (
                            <button key={c.id} type="button" aria-pressed={picked} disabled={already} onClick={() => toggleConsole(c.id)}
                              title={[label.code, label.name, already ? "already has this game" : ""].filter(Boolean).join(" · ")}
                              className={cn("relative flex h-[68px] flex-col justify-between rounded-lg border bg-card px-2.5 py-2 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                                picked ? "border-primary bg-primary/15 ring-2 ring-primary/50" : "border-border hover:border-primary/50",
                                already && "cursor-not-allowed opacity-50 hover:border-border")}>
                              <span className="flex items-start justify-between gap-1">
                                <span className="text-base font-semibold leading-none tabular-nums text-foreground">{label.code}</span>
                                {picked || already ? <Check aria-hidden className={cn("h-4 w-4", picked ? "text-primary" : "text-muted-foreground")} /> : <Icon aria-hidden className="h-4 w-4 text-muted-foreground" />}
                              </span>
                              <span className="truncate text-[11px] text-muted-foreground">{already ? "Already has it" : label.name || [c.brand, c.model_number].filter(Boolean).join(" ") || platformLabel(platformKey(c.console_type))}</span>
                            </button>
                          )
                        })}
                      </div>
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <IndianRupee aria-hidden className="h-3.5 w-3.5" />
                        Priced at {formatRupees(platform.single_slot_price)}/slot from the {platform.platform_type} group. Change it in Console Pricing.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-sm text-muted-foreground" role="status">
            {step === 2 && platform ? (n ? <><span className="font-semibold tabular-nums text-foreground">{n}</span> station{n === 1 ? "" : "s"} selected</> : "Pick one or more stations") : step === 1 && allGames.length > 0 ? `${allGames.length} games` : ""}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            {step === 2 && (
              <Button type="button" onClick={submit} disabled={submitting || n === 0 || !platform} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {submitting ? "Adding…" : n ? `Add to ${n} station${n === 1 ? "" : "s"}` : "Add to stations"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
