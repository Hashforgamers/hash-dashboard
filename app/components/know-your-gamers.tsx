"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Users, TrendingUp, Award, Clock, Search, Filter } from "lucide-react"
import { DASHBOARD_URL } from "@/src/config/env"
import { jwtDecode } from "jwt-decode"
import { MobileCompactCard } from "@/components/ui/mobile-compact-card"
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
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTier, setSelectedTier] = useState("all")
  const [gamerData, setGamerData] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<number | null>(null)
  const [deepLinkReady, setDeepLinkReady] = useState(false)

  const GAMER_CACHE_KEY = "gamerDataCache"
  const STATS_CACHE_KEY = "gamerStatsCache"
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  const POLL_INTERVAL = 1 * 1000 // 1 minute

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
          console.log("Loaded gamer data from cache")
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
    pollingInterval = setInterval(() => loadGamerData(false), POLL_INTERVAL)

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

  const filteredData = gamerData.filter((gamer) => {
    const matchesSearch =
      gamer.name.toLowerCase().includes(searchTerm.toLowerCase()) || gamer.contact.includes(searchTerm)
    const matchesTier = selectedTier === "all" || gamer.membershipTier.toLowerCase() === selectedTier.toLowerCase()
    return matchesSearch && matchesTier
  })

  const getTierBadgeClass = (tier: string) => {
    const normalized = (tier || "").toLowerCase()
    if (normalized === "platinum") {
      return "border border-cyan-300/40 bg-cyan-500/15 text-cyan-200"
    }
    if (normalized === "gold") {
      return "border border-amber-300/40 bg-amber-500/15 text-amber-200"
    }
    if (normalized === "silver") {
      return "border border-slate-300/40 bg-slate-400/15 text-slate-200"
    }
    return "border border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
  }

  return (
    <div className="dashboard-module dashboard-typography flex h-full min-h-0 flex-col gap-4 p-1 sm:p-2">
      {/* Stats Cards */}
      <div className="shrink-0 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = iconMap[stat.icon as keyof typeof iconMap]
          return (
            <div
              key={index}
              className="gaming-kpi-card rounded-xl border border-cyan-400/20 p-3 sm:p-4"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] uppercase tracking-wide text-slate-500 sm:text-sm">{stat.title}</p>
                  <h3 className="mt-1 truncate text-base font-bold text-cyan-300 sm:text-2xl">{stat.value}</h3>
                </div>
                <div className="ml-2 flex-shrink-0 rounded-full border border-cyan-400/25 bg-cyan-500/10 p-2 sm:ml-3 sm:p-3">
                  <Icon className="h-4 w-4 text-cyan-300 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-[11px] sm:text-sm">
                <span className="text-emerald-300">{stat.change}</span>
                <span className="ml-1 text-slate-500">vs last month</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters and Search */}
      <div className="gaming-panel shrink-0 rounded-xl border border-cyan-400/20">
        <div className="dashboard-toolbar p-4">
          <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or contact..."
              className="dashboard-module-input h-10 w-full pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-shrink-0">
            <Filter className="h-5 w-5 text-slate-500" />
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
          <MobileCompactCard className="border-cyan-400/20 bg-slate-900/60 p-4 text-sm text-slate-400">
            Loading gamers...
          </MobileCompactCard>
        ) : filteredData.length === 0 ? (
          <MobileCompactCard className="border-cyan-400/20 bg-slate-900/60 p-4 text-sm text-slate-400">
            No gamers found for this filter.
          </MobileCompactCard>
        ) : (
          filteredData.map((gamer) => (
            <MobileCompactCard key={gamer.id} className="border-cyan-400/20 bg-slate-900/60">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-cyan-300">{gamer.name}</p>
                  <p className="text-xs text-slate-400">#{gamer.id} · {gamer.contact}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${getTierBadgeClass(gamer.membershipTier)}`}>
                  {gamer.membershipTier}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-cyan-500/10 bg-slate-950/40 p-2">
                  <p className="text-slate-500">Total Slots</p>
                  <p className="font-semibold text-slate-200">{gamer.totalSlots}</p>
                </div>
                <div className="rounded-md border border-cyan-500/10 bg-slate-950/40 p-2">
                  <p className="text-slate-500">Avg / Slot</p>
                  <p className="font-semibold text-slate-200">₹{gamer.averagePerSlot}</p>
                </div>
                <div className="rounded-md border border-cyan-500/10 bg-slate-950/40 p-2">
                  <p className="text-slate-500">Total Amount</p>
                  <p className="font-semibold text-slate-200">₹{gamer.totalAmount.toLocaleString()}</p>
                </div>
                <div className="rounded-md border border-cyan-500/10 bg-slate-950/40 p-2">
                  <p className="text-slate-500">Net Revenue</p>
                  <p className="font-semibold text-slate-200">₹{gamer.netRevenue.toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Last Visit: {gamer.lastVisit ? format(new Date(gamer.lastVisit), "dd MMM yyyy") : "-"}
              </p>
              {gamer.notes ? <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{gamer.notes}</p> : null}
            </MobileCompactCard>
          ))
        )}
      </div>

      <div className="dashboard-table-shell hidden min-h-0 flex-1 md:block">
        <div className="dashboard-table-wrap h-full">
          <table className="dashboard-table min-w-[1200px] max-md:min-w-[860px]">
            <thead className="dashboard-module-table-head">
              <tr className="border-b border-cyan-500/20">
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
                  "Notes",
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
            <tbody className="dashboard-module-table-body divide-y divide-cyan-500/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={12}>
                    Loading gamers...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={12}>
                    No gamers found for this filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((gamer) => (
                <tr key={gamer.id} className="dashboard-module-row hover:bg-cyan-500/5">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{gamer.id}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-cyan-300">{gamer.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{gamer.contact}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{gamer.totalSlots}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">₹{gamer.totalAmount.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">₹{gamer.averagePerSlot}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{gamer.promoCodesUsed}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">₹{gamer.discountAvailed.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">₹{gamer.netRevenue.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                    {gamer.lastVisit && format(new Date(gamer.lastVisit), "dd MMM yyyy")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getTierBadgeClass(gamer.membershipTier)}`}>
                      {gamer.membershipTier}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm text-slate-500">{gamer.notes}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Mobile-friendly message when table is scrollable */}
        <div className="border-t border-cyan-500/20 p-4 text-center text-sm text-slate-500">
          Scroll horizontally to view all columns
        </div>
      </div>
    </div>
  )
}
