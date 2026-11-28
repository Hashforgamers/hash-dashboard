"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { jwtDecode } from "jwt-decode"
import { toast } from "sonner"
import { DASHBOARD_URL } from "@/src/config/env"
import { confirmDialog } from "@/app/components/confirm-dialog"
import { useDashboardData } from "@/app/context/DashboardDataContext"
import { stationLabel, stationNames, type Game, type LibraryConsole, type VendorGame } from "./library"

export interface PlatformConsole {
  id: number
  console_number: number
  console_type: string
  brand: string
  model_number: string
  serial_number: string
  description?: string
}

/** One row of GET /vendor/{id}/available-games (a priced console group). */
export interface PlatformType {
  id: number
  platform_type: string
  total_consoles: number
  single_slot_price: number
  consoles: PlatformConsole[]
}

/** Vendor games, console groups and station names for the Game Library, plus its add/remove actions. */
export function useGameLibrary() {
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [vendorGames, setVendorGames] = useState<VendorGame[]>([])
  const [platformTypes, setPlatformTypes] = useState<PlatformType[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { consoles, refreshConsoles } = useDashboardData()

  useEffect(() => {
    const token = localStorage.getItem("jwtToken")
    if (!token) { setLoading(false); return }
    try {
      setVendorId(jwtDecode<{ sub: { id: number } }>(token).sub.id)
    } catch (error) {
      console.error("Error decoding JWT:", error)
      setLoadError("Failed to authenticate. Please login again.")
      setLoading(false)
    }
  }, [])

  const fetchPlatformTypes = useCallback(async () => {
    if (!vendorId) return
    try {
      const response = await fetch(`${DASHBOARD_URL}/vendor/${vendorId}/available-games`)
      if (!response.ok) throw new Error("Failed to fetch platforms")
      const data = await response.json()
      setPlatformTypes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching platforms:", err)
    }
  }, [vendorId])

  const fetchVendorGames = useCallback(async () => {
    if (!vendorId) return
    try {
      const response = await fetch(`${DASHBOARD_URL}/vendor/${vendorId}/vendor-games`)
      if (!response.ok) throw new Error("Failed to fetch vendor games")
      const data = await response.json()
      setVendorGames(Array.isArray(data) ? data : [])
      setLoadError(null)
    } catch (err) {
      console.error("Error fetching vendor games:", err)
      setVendorGames([])
      setLoadError("Could not load your game library.")
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    if (!vendorId) return
    void fetchPlatformTypes()
    void fetchVendorGames()
    void refreshConsoles() // station names, shared cache with Gaming Stations
  }, [vendorId, fetchPlatformTypes, fetchVendorGames, refreshConsoles])

  const names = useMemo(() => stationNames(Array.isArray(consoles) ? consoles : []), [consoles])

  /** POST {game_id, console_ids}; the backend prices it from the console group. */
  const addGame = useCallback(async (game: Game, consoleIds: number[]): Promise<boolean> => {
    if (!vendorId || consoleIds.length === 0) return false
    try {
      const response = await fetch(`${DASHBOARD_URL}/vendor/${vendorId}/vendor-games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: game.id, console_ids: consoleIds }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to add game")
      }
      const result = await response.json().catch(() => ({}))
      toast.success(result.message || `${game.name} added`)
      await fetchVendorGames()
      return true
    } catch (err: any) {
      console.error("Error adding game:", err)
      toast.error(err?.message || "Failed to add game. Please try again.")
      return false
    }
  }, [vendorId, fetchVendorGames])

  const removeFromStation = useCallback(async (game: Game, row: LibraryConsole): Promise<boolean> => {
    const station = stationLabel(row, names).code
    if (!await confirmDialog(`Remove ${game.name} from ${station}?`)) return false
    try {
      const response = await fetch(`${DASHBOARD_URL}/vendor/${vendorId}/vendor-games/${row.vendor_game_id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete game")
      toast.success(`${game.name} removed from ${station}`)
      await fetchVendorGames()
      return true
    } catch (err) {
      console.error("Error deleting game:", err)
      toast.error("Failed to remove game")
      return false
    }
  }, [vendorId, names, fetchVendorGames])

  return { vendorId, vendorGames, platformTypes, names, loading, loadError, addGame, removeFromStation, reload: fetchVendorGames }
}
