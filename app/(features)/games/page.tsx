"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Gamepad2, Loader2, Plus, SearchX } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import {
  NO_FILTERS, PAGE_SIZE, filterGames, genreFacets, paginate, platformFacets, sortGames,
  type Density, type Game, type LibraryFilters, type SortKey,
} from "./library"
import { useGameLibrary } from "./use-game-library"
import { GameCard } from "./game-card"
import { GameFilters } from "./game-filters"
import { GameDetailSheet } from "./game-detail-sheet"
import { AddGameDialog } from "./add-game-dialog"
import { LibraryPagination } from "./library-pagination"
import styles from "./games.module.css"

const DENSITY_KEY = "hash.games.density"

export default function GamesManagementPage() {
  const { vendorGames, platformTypes, names, loading, loadError, addGame, removeFromStation } = useGameLibrary()

  const [filters, setFilters] = useState<LibraryFilters>(NO_FILTERS)
  const [sort, setSort] = useState<SortKey>("name")
  const [density, setDensity] = useState<Density>("comfortable")
  const [page, setPage] = useState(1)
  const [openGameId, setOpenGameId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addFor, setAddFor] = useState<Game | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(DENSITY_KEY)
    if (saved === "compact" || saved === "comfortable") setDensity(saved)
  }, [])
  const changeDensity = (next: Density) => { setDensity(next); setPage(1); localStorage.setItem(DENSITY_KEY, next) }
  const changeFilters = (next: LibraryFilters) => { setFilters(next); setPage(1) }
  const changeSort = (next: SortKey) => { setSort(next); setPage(1) }

  const platforms = useMemo(() => platformFacets(vendorGames), [vendorGames])
  const genres = useMemo(() => genreFacets(vendorGames), [vendorGames])
  const visible = useMemo(() => sortGames(filterGames(vendorGames, filters), sort), [vendorGames, filters, sort])
  const perPage = PAGE_SIZE[density]
  const paged = paginate(visible, page, perPage)
  const stationCount = useMemo(() => new Set(vendorGames.flatMap(vg => vg.consoles.map(c => c.id))).size, [vendorGames])
  const installed = useMemo(() => new Map(vendorGames.map(vg => [vg.game.id, new Set(vg.consoles.map(c => c.id))])), [vendorGames])
  const openGame = vendorGames.find(vg => vg.game.id === openGameId) || null

  // A removed last station drops the game from the list; close its sheet.
  useEffect(() => { if (openGameId !== null && !loading && !openGame) setOpenGameId(null) }, [openGameId, openGame, loading])

  const goToPage = (next: number) => {
    setPage(next)
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }
  const openAdd = (game: Game | null) => { setAddFor(game); setAddOpen(true) }

  return (
    <DashboardLayout contentScroll="contained">
      <div className={cn("dashboard-module dashboard-typography dashboard-page-shell h-full", styles.page)}>
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="premium-heading">Game Library</h1>
              {!loading && <span className={styles.count} aria-label={`${vendorGames.length} games`}>{vendorGames.length}</span>}
            </div>
            {!loading && vendorGames.length > 0 && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {vendorGames.length} game{vendorGames.length === 1 ? "" : "s"} across {stationCount} station{stationCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <Button type="button" className="gap-2" onClick={() => openAdd(null)}><Plus className="h-4 w-4" />Add game</Button>
        </header>

        <div ref={scrollRef} className={styles.scroller}>
          {loading ? (
            <div className="grid min-h-[320px] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : vendorGames.length === 0 ? (
            <EmptyState
              icon={<Gamepad2 className="h-8 w-8" />}
              title={loadError ? "Couldn’t load your games" : "No games yet"}
              body={loadError || "Add games to your stations so players can pick them when they book."}
              action={<Button type="button" className="gap-2" onClick={() => openAdd(null)}><Plus className="h-4 w-4" />Add your first game</Button>}
            />
          ) : (
            <>
              <GameFilters
                filters={filters} onChange={changeFilters} platforms={platforms} genres={genres}
                sort={sort} onSort={changeSort} density={density} onDensity={changeDensity}
                total={vendorGames.length} shown={visible.length}
              />
              {visible.length === 0 ? (
                <EmptyState
                  icon={<SearchX className="h-8 w-8" />}
                  title="No games match"
                  body="Try another search or remove a filter."
                  action={<Button type="button" variant="outline" onClick={() => changeFilters(NO_FILTERS)}>Clear filters</Button>}
                />
              ) : (
                <ul className={cn(styles.grid, density === "compact" && styles.gridCompact)} aria-label="Games">
                  {paged.items.map((vg, index) => (
                    <motion.li key={vg.game.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(index, 18) * 0.018, ease: "easeOut" }}>
                      <GameCard vg={vg} compact={density === "compact"} onOpen={() => setOpenGameId(vg.game.id)} />
                    </motion.li>
                  ))}
                </ul>
              )}
              <LibraryPagination page={paged.page} pages={paged.pages} total={visible.length} perPage={perPage} onPage={goToPage} />
            </>
          )}
        </div>

        <GameDetailSheet
          vg={openGame}
          names={names}
          onClose={() => setOpenGameId(null)}
          onRemove={c => (openGame ? removeFromStation(openGame.game, c) : Promise.resolve(false))}
          onAddStations={() => { if (openGame) { const game = openGame.game; setOpenGameId(null); openAdd(game) } }}
        />
        <AddGameDialog
          open={addOpen}
          initialGame={addFor}
          onClose={() => setAddOpen(false)}
          platformTypes={platformTypes}
          names={names}
          installed={installed}
          onAdd={addGame}
        />
      </div>
    </DashboardLayout>
  )
}

function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="mx-auto mt-6 flex max-w-md flex-col items-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-muted/50 text-muted-foreground">{icon}</span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <div className="mt-5">{action}</div>
    </div>
  )
}
