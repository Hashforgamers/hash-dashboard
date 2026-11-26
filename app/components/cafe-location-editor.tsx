"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Crosshair, ExternalLink, Loader2, MapPin, Search } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DASHBOARD_URL } from "@/src/config/env"
import { useApiClient } from "@/app/hooks/useApiClient"

const LocationMap = dynamic(() => import("./cafe-location-map"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">Loading map…</div>,
})

type Point = { lat: number; lng: number }
const INDIA: Point = { lat: 20.5937, lng: 78.9629 }

const parsePoint = (lat: unknown, lng: unknown): Point | null => {
  const a = Number(lat), b = Number(lng)
  if (!Number.isFinite(a) || !Number.isFinite(b) || (a === 0 && b === 0)) return null
  if (a < -90 || a > 90 || b < -180 || b > 180) return null
  return { lat: a, lng: b }
}

/** Reads "12.97, 77.59" or a Google Maps link (…/@12.97,77.59,… or ?q=12.97,77.59). */
export const pointFromText = (text: string): Point | null => {
  const match = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ||
    text.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ||
    text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  return match ? parsePoint(match[1], match[2]) : null
}

export function CafeLocationEditor({ vendorId, latitude, longitude, address, onSaved }: {
  vendorId: number | string | null
  latitude?: string | number | null
  longitude?: string | number | null
  address?: string | null
  onSaved?: (point: Point) => void
}) {
  const api = useApiClient()
  const saved = useMemo(() => parsePoint(latitude, longitude), [latitude, longitude])
  const [point, setPoint] = useState<Point | null>(saved)
  const [lat, setLat] = useState(saved ? String(saved.lat) : "")
  const [lng, setLng] = useState(saved ? String(saved.lng) : "")
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState<"" | "save" | "search" | "locate">("")

  useEffect(() => { setPoint(saved); setLat(saved ? String(saved.lat) : ""); setLng(saved ? String(saved.lng) : "") }, [saved])

  const move = (next: Point) => {
    const rounded = { lat: Number(next.lat.toFixed(6)), lng: Number(next.lng.toFixed(6)) }
    setPoint(rounded); setLat(String(rounded.lat)); setLng(String(rounded.lng))
  }
  const typed = parsePoint(lat, lng)
  const changed = Boolean(typed && (!saved || typed.lat !== saved.lat || typed.lng !== saved.lng))

  const search = async () => {
    const text = query.trim() || address || ""
    if (!text) return
    const pasted = pointFromText(text)
    if (pasted) { move(pasted); return }
    setBusy("search")
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(text)}`, { headers: { Accept: "application/json" } })
      const [hit] = await res.json()
      const found = hit ? parsePoint(hit.lat, hit.lon) : null
      if (found) move(found)
      else toast.error("No match. Drop the pin on the map or paste a Google Maps link.")
    } catch {
      toast.error("Search is unavailable. Drop the pin on the map instead.")
    } finally { setBusy("") }
  }

  const locate = () => {
    if (!navigator.geolocation) { toast.error("This browser can't share location."); return }
    setBusy("locate")
    navigator.geolocation.getCurrentPosition(
      pos => { move({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setBusy("") },
      () => { toast.error("Location permission was denied."); setBusy("") },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const save = async () => {
    if (!typed || !vendorId) return
    setBusy("save")
    try {
      const res = await api.patch<any, string>(`${DASHBOARD_URL}/api/vendor/${vendorId}/business-details`,
        JSON.stringify({ latitude: typed.lat, longitude: typed.lng }),
        { headers: { "Content-Type": "application/json" }, timeoutMs: 10_000, retries: 0 })
      if (!res?.success) throw new Error(res?.message || "Could not save the location")
      toast.success("Map location saved. Gamers will see the new pin.")
      onSaved?.(typed)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the location")
    } finally { setBusy("") }
  }

  return (
    <Card className="account-panel overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="account-section-title flex items-center gap-2"><MapPin className="icon-lg text-muted-foreground" />Map location</CardTitle>
        <CardDescription className="account-description">Drag the pin or click the map to where your cafe's entrance is.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void search() }}
            placeholder={address ? `Search "${address}" or paste a Google Maps link` : "Search an address or paste a Google Maps link"} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void search()} disabled={busy !== ""}>
              {busy === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Find
            </Button>
            <Button variant="outline" onClick={locate} disabled={busy !== ""} title="Use this device's location (when you're at the cafe)">
              {busy === "locate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}Here
            </Button>
          </div>
        </div>

        <LocationMap point={point} fallback={INDIA} onChange={move} />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label htmlFor="cafe-lat">Latitude</Label><Input id="cafe-lat" inputMode="decimal" value={lat} onChange={e => { setLat(e.target.value); const p = parsePoint(e.target.value, lng); if (p) setPoint(p) }} /></div>
          <div className="space-y-1"><Label htmlFor="cafe-lng">Longitude</Label><Input id="cafe-lng" inputMode="decimal" value={lng} onChange={e => { setLng(e.target.value); const p = parsePoint(lat, e.target.value); if (p) setPoint(p) }} /></div>
        </div>
        {(lat || lng) && !typed && <p className="text-xs text-red-400">Enter a valid latitude (−90 to 90) and longitude (−180 to 180).</p>}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {typed ? (
            <a className="inline-flex items-center gap-1 text-xs text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${typed.lat},${typed.lng}`}>
              Check in Google Maps<ExternalLink className="h-3 w-3" />
            </a>
          ) : <span />}
          <Button onClick={() => void save()} disabled={!changed || busy !== ""}>
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}Save location
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
