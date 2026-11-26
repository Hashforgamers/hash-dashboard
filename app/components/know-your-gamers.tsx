"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Users, TrendingUp, Award, Clock, Search, Filter, Megaphone } from "lucide-react"
import { DASHBOARD_URL } from "@/src/config/env"
import { jwtDecode } from "jwt-decode"
import { MobileCompactCard } from "@/components/ui/mobile-compact-card"
import { Button } from "@/components/ui/button"
import { useAccess } from "@/app/context/AccessContext"
import GamerPromotionDialog from "@/app/components/gamer-promotion-dialog"
import { GamerProfileSheet, tierBadgeVariant } from "@/app/components/gamer-profile-sheet"
import { Badge } from "@/components/ui/badge"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { readEnumParam, readStringParam, updateSearchParams } from "@/lib/deeplink"

// Define icon mapping
const iconMap = {
  Users,
  TrendingUp,
  Award,
  Clock,
}

// Replace mock data with dynamic API call
export function KnowYourGamers() {
  const { can } = useAccess()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTier, setSelectedTier] = useState("all")
  const [gamerData, setGamerData] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [promotionGamer, setPromotionGamer] = useState<any | null>(null)
  const [deepLinkReady, setDeepLinkReady] = useState(false)
  const linkedGamer = Number(readStringParam(searchParams, "gamer", "")) || null

  const GAMER_CACHE_KEY = "gamerDataCache"
  const STATS_CACHE_KEY = "gamerStatsCache"
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  const POLL_INTERVAL = 60 * 1000 // 1 minute

  useEffect(() => {
    const token = localStorage.getItem("jwtToken")
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token)
      setVendorId(decoded_token.sub.id)
    }
  }, [])

  useEffect(() => {
    const linkedSearch = readStringParam(searchParams, "q", "")
    const linkedTier = readEnumParam(searchParams, "tier", ["all", "platinum", "gold", "silver"], "all")
    setSearchTerm(linkedSearch)
    setSelectedTier(linkedTier)
    setDeepLinkReady(true)
  }, [])

  useEffect(() => {
    if (!vendorId) return

    let pollingInterval: NodeJS.Timeout

    const loadGamerData = async (isInitial = false) => {
      try {
        const now = Date.now()

        // Try cache first
        const cachedGamer = localStorage.getItem(GAMER_CACHE_KEY)
        const cachedStats = localStorage.getItem(STATS_CACHE_KEY)
        const gamerParsed = cachedGamer ? JSON.parse(cachedGamer) : null
        const statsParsed = cachedStats ? JSON.parse(cachedStats) : null

        const isCacheValid = (entry: any) => entry && entry.timestamp && now - entry.timestamp < CACHE_TTL

        if (isInitial && isCacheValid(gamerParsed) && isCacheValid(statsParsed)) {
          setGamerData(gamerParsed.data)
          setStats(statsParsed.data)
          setLoading(false)
          return
        }

        // Fetch fresh
        const [gamerRes, statsRes] = await Promise.all([
          fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/knowYourGamer`),
          fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/knowYourGamer/stats`),
        ])

        const gamerJson = await gamerRes.json()
        const statsJson = await statsRes.json()

        if (Array.isArray(gamerJson)) {
          setGamerData(gamerJson)
          localStorage.setItem(GAMER_CACHE_KEY, JSON.stringify({ data: gamerJson, timestamp: now }))
        }

        const formattedStats = [
          {
            title: "Total Gamers",
            value: statsJson.totalGamers?.toLocaleString() || "0",
            icon: "Users",
            change: statsJson.totalGamersGrowth || "+0%",
          },
          {
            title: "Average Revenue",
            value: `₹${statsJson.averageRevenue?.toLocaleString() || "0"}`,
            icon: "TrendingUp",
            change: statsJson.revenueGrowth || "+0%",
          },
          {
            title: "Premium Members",
            value: statsJson.premiumMembers?.toLocaleString() || "0",
            icon: "Award",
            change: statsJson.premiumMembersGrowth || statsJson.membersGrowth || "+0%",
          },
          {
            title: "Avg. Session Time",
            value: statsJson.avgSessionTime ?? "N/A",
            icon: "Clock",
            change: statsJson.sessionGrowth || "+0%",
          },
        ]

        setStats(formattedStats)
        localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ data: formattedStats, timestamp: now }))
      } catch (err) {
        console.error("Error fetching gamer/stats:", err)
      } finally {
        setLoading(false)
      }
    }

    loadGamerData(true) // Initial load with cache
    pollingInterval = setInterval(() => { if (!document.hidden) void loadGamerData(false); }, POLL_INTERVAL)

    return () => clearInterval(pollingInterval)
  }, [vendorId])

  useEffect(() => {
    if (!deepLinkReady) return
    const next = updateSearchParams(searchParams, {
      q: searchTerm || null,
      tier: selectedTier === "all" ? null : selectedTier,
    })
    const currentQuery = searchParams.toString()
    const nextQuery = next.toString()
    if (currentQuery === nextQuery) return
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }, [deepLinkReady, searchTerm, selectedTier, pathname, router, searchParams])

  const openGamer = (id: number | null) => {
    const next = updateSearchParams(searchParams, { gamer: id })
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const filteredData = gamerData.filter((gamer) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term || (gamer.name || "").toLowerCase().includes(term) || String(gamer.contact || "").includes(term) || String(gamer.id) === term
    const matchesTier = selectedTier === "all" || gamer.membershipTier.toLowerCase() === selectedTier.toLowerCase()
    return matchesSearch && matchesTier
  })

  return (
    <div className="dashboard-module dashboard-typography flex h-full min-h-0 flex-col gap-3">
      {/* Stats Cards */}
      <div className="shrink-0 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = iconMap[stat.icon as keyof typeof iconMap]
          return (
            <div
              key={index}
              className="gaming-kpi-card rounded-lg border p-3"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted-foreground">{stat.title}</p>
                  <h3 className="mt-1 truncate text-xl font-semibold text-foreground">{stat.value}</h3>
                </div>
                <div className="ml-2 flex-shrink-0 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <span className={String(stat.change).startsWith("-") ? "text-red-400" : "text-emerald-400"}>{stat.change}</span> vs last month
              </p>
            </div>
          )
        })}
      </div>

      {/* Filters and Search */}
      <div className="gaming-panel shrink-0 rounded-lg border">
        <div className="dashboard-toolbar p-4">
          <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <Search data-search-icon="" aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input data-search-input=""
              type="text"
              placeholder="Search name, phone or ID"
              className="dashboard-module-input h-10 w-full pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              className="dashboard-module-input h-10 min-w-0 flex-1 px-3 sm:flex-none"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
            >
              <option value="all">All Tiers</option>
              <option value="platinum">Platinum</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <MobileCompactCard className="p-4 text-sm text-muted-foreground">
            Loading gamers...
          </MobileCompactCard>
        ) : filteredData.length === 0 ? (
          <MobileCompactCard className="p-4 text-sm text-muted-foreground">
            No gamers found for this filter.
          </MobileCompactCard>
        ) : (
          filteredData.map((gamer) => (
            <MobileCompactCard key={gamer.id}>
              <button type="button" className="flex w-full items-start justify-between gap-2 text-left" onClick={() => openGamer(gamer.id)}>
                <div>
                  <p className="text-sm font-semibold text-primary">{gamer.name}</p>
                  <p className="text-xs text-muted-foreground">#{gamer.id} · {gamer.contact}</p>
                </div>
                <Badge variant={tierBadgeVariant(gamer.membershipTier)}>{gamer.membershipTier}</Badge>
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border bg-muted/40 p-2">
                  <p className="text-muted-foreground">Total Slots</p>
                  <p className="font-semibold text-foreground">{gamer.totalSlots}</p>
                </div>
                <div className="rounded-md border bg-muted/40 p-2">
                  <p className="text-muted-foreground">Avg / Slot</p>
                  <p className="font-semibold text-foreground">₹{gamer.averagePerSlot}</p>
                </div>
                <div className="rounded-md border bg-muted/40 p-2">
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-semibold text-foreground">₹{gamer.totalAmount.toLocaleString()}</p>
                </div>
                <div className="rounded-md border bg-muted/40 p-2">
                  <p className="text-muted-foreground">Net Revenue</p>
                  <p className="font-semibold text-foreground">₹{gamer.netRevenue.toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Last Visit: {gamer.lastVisit ? format(new Date(gamer.lastVisit), "dd MMM yyyy") : "-"}
              </p>
              {can("account.manage") && <Button size="sm" variant="outline" className="mt-3" onClick={() => setPromotionGamer(gamer)}><Megaphone className="mr-2 h-4 w-4" />Send promotion</Button>}
            </MobileCompactCard>
          ))
        )}
      </div>

      <div className="dashboard-table-shell hidden min-h-0 flex-1 md:block">
        <div className="dashboard-table-wrap h-full">
          <table className="dashboard-table min-w-[1200px] max-md:min-w-[860px]">
            <thead className="dashboard-module-table-head">
              <tr>
                {[
                  "Customer ID",
                  "Name",
                  "Contact",
                  "Total Slots",
                  "Total Amount",
                  "Average/Slot",
                  "Promos Used",
                  "Discount",
                  "Net Revenue",
                  "Last Visit",
                  "Tier",
                  "",
                ].map((header) => (
                  <th
                    key={header}
                    className="dashboard-module-table-header whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="dashboard-module-table-body">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={12}>
                    Loading gamers...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={12}>
                    No gamers found for this filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((gamer) => (
                <tr key={gamer.id} className="dashboard-module-row cursor-pointer" onClick={() => openGamer(gamer.id)} title="Open booking history">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{gamer.id}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-primary">{gamer.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{gamer.contact}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{gamer.totalSlots}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">₹{gamer.totalAmount.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">₹{gamer.averagePerSlot}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{gamer.promoCodesUsed}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">₹{gamer.discountAvailed.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">₹{gamer.netRevenue.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                    {gamer.lastVisit && format(new Date(gamer.lastVisit), "dd MMM yyyy")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Badge variant={tierBadgeVariant(gamer.membershipTier)}>{gamer.membershipTier}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm" onClick={e => e.stopPropagation()}>{can("account.manage") && <Button size="sm" variant="outline" onClick={() => setPromotionGamer(gamer)}><Megaphone className="mr-2 h-4 w-4" />Promote</Button>}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      <GamerProfileSheet vendorId={vendorId} gamerId={linkedGamer} onOpenChange={open => { if (!open) openGamer(null) }} />
      {can("account.manage") && <GamerPromotionDialog vendorId={vendorId} gamer={promotionGamer} onOpenChange={open => { if (!open) setPromotionGamer(null) }} />}
    </div>
  )
}
