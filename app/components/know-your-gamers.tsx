"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Users, TrendingUp, Award, Clock, Search, Filter } from "lucide-react"
import { DASHBOARD_URL } from "@/src/config/env"
import { jwtDecode } from "jwt-decode"

// Define icon mapping
const iconMap = {
  Users,
  TrendingUp,
  Award,
  Clock,
}

// Replace mock data with dynamic API call
export function KnowYourGamers() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTier, setSelectedTier] = useState("all")
  const [gamerData, setGamerData] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<number | null>(null)

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
            change: statsJson.membersGrowth || "+0%",
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
            change: statsJson.membersGrowth || "+0%",
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
    <div className="space-y-4 p-1 sm:p-2">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = iconMap[stat.icon as keyof typeof iconMap]
          return (
            <div
              key={index}
              className="gaming-kpi-card rounded-xl border border-cyan-400/20 bg-gradient-to-br from-slate-900/75 via-slate-900/65 to-cyan-950/20 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs uppercase tracking-wide text-slate-300/75 sm:text-sm">{stat.title}</p>
                  <h3 className="mt-1 truncate text-xl font-bold text-cyan-100 sm:text-2xl">{stat.value}</h3>
                </div>
                <div className="ml-3 flex-shrink-0 rounded-full border border-cyan-400/25 bg-cyan-500/10 p-3">
                  <Icon className="h-5 w-5 text-cyan-300 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs sm:text-sm">
                <span className="text-emerald-300">{stat.change}</span>
                <span className="ml-1 text-slate-300/70">vs last month</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters and Search */}
      <div className="gaming-panel rounded-xl border border-cyan-400/20 bg-slate-950/40">
        <div className="flex flex-col sm:flex-row gap-4 p-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300/70" />
            <input
              type="text"
              placeholder="Search by name or contact..."
              className="w-full rounded-lg border border-cyan-400/25 bg-slate-900/70 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="h-5 w-5 text-slate-300/70" />
            <select
              className="min-w-0 rounded-lg border border-cyan-400/25 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
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
      <div className="gaming-panel overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950/45">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-slate-900/70">
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
                    className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-300/70" colSpan={12}>
                    Loading gamers...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-300/70" colSpan={12}>
                    No gamers found for this filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((gamer) => (
                <tr key={gamer.id} className="hover:bg-cyan-500/5">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-200">{gamer.id}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-cyan-100">{gamer.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-200">{gamer.contact}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-200">{gamer.totalSlots}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-200">₹{gamer.totalAmount.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-200">₹{gamer.averagePerSlot}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-200">{gamer.promoCodesUsed}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-200">₹{gamer.discountAvailed.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-200">₹{gamer.netRevenue.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-200">
                    {gamer.lastVisit && format(new Date(gamer.lastVisit), "dd MMM yyyy")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getTierBadgeClass(gamer.membershipTier)}`}>
                      {gamer.membershipTier}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm text-slate-300">{gamer.notes}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Mobile-friendly message when table is scrollable */}
        <div className="border-t border-cyan-500/20 p-4 text-center text-sm text-slate-300/70 sm:hidden">
          Scroll horizontally to view all columns
        </div>
      </div>
    </div>
  )
}
