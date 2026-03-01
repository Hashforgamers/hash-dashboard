"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Users, TrendingUp, Award, Clock, Search, Filter, Lock } from "lucide-react"
import { DASHBOARD_URL } from "@/src/config/env"
import { jwtDecode } from "jwt-decode"
import { useRouter } from "next/navigation"
import { useSubscription } from "@/hooks/useSubscription"
import { cn } from "@/lib/utils"

// Define icon mapping
const iconMap = {
  Users,
  TrendingUp,
  Award,
  Clock,
}

/* ------------------------------------------------------------------ */
/*                         LOCKED OVERLAY                              */
/*                                                                     */
/* Uses `absolute inset-0` (NOT fixed) so it only covers the content  */
/* wrapper div. The sidebar lives outside that div and is unaffected.  */
/* ------------------------------------------------------------------ */
function LockedOverlay() {
  const router = useRouter()
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-md rounded-xl pointer-events-auto">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="p-4 bg-destructive/10 rounded-full shadow-sm">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">Subscription Required</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
            Subscribe to view gamer analytics and insights.
          </p>
        </div>
        <button
          onClick={() => router.push("/subscription")}
          className="mt-2 px-8 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-md"
        >
          Subscribe Now
        </button>
      </div>
    </div>
  )
}

// Replace mock data with dynamic API call
export function KnowYourGamers() {
  const { isLocked } = useSubscription()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTier, setSelectedTier] = useState("all")
  const [gamerData, setGamerData] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorId, setVendorId] = useState<number | null>(null)

  const GAMER_CACHE_KEY = "gamerDataCache"
  const STATS_CACHE_KEY = "gamerStatsCache"
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  const POLL_INTERVAL = 1 * 1000   // 1 minute

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

        const cachedGamer = localStorage.getItem(GAMER_CACHE_KEY)
        const cachedStats = localStorage.getItem(STATS_CACHE_KEY)
        const gamerParsed = cachedGamer ? JSON.parse(cachedGamer) : null
        const statsParsed = cachedStats ? JSON.parse(cachedStats) : null

        const isCacheValid = (entry: any) =>
          entry && entry.timestamp && now - entry.timestamp < CACHE_TTL

        if (isInitial && isCacheValid(gamerParsed) && isCacheValid(statsParsed)) {
          setGamerData(gamerParsed.data)
          setStats(statsParsed.data)
          setLoading(false)
          return
        }

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

    loadGamerData(true)
    pollingInterval = setInterval(() => loadGamerData(false), POLL_INTERVAL)

    return () => clearInterval(pollingInterval)
  }, [vendorId])

  const filteredData = gamerData.filter((gamer) => {
    const matchesSearch =
      gamer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gamer.contact.includes(searchTerm)
    const matchesTier =
      selectedTier === "all" ||
      gamer.membershipTier.toLowerCase() === selectedTier.toLowerCase()
    return matchesSearch && matchesTier
  })

  return (
    // ── KEY: relative so LockedOverlay (absolute inset-0) is scoped here ──
    // ── The sidebar lives in the parent layout OUTSIDE this div ──────────
    <div className="relative w-full min-h-full">

      {/* LockedOverlay: absolute → only covers this div, NOT the sidebar */}
      {isLocked && <LockedOverlay />}

      {/* Content: blurred + non-interactive when locked */}
      <div className={cn("space-y-6 p-4 sm:p-6", isLocked && "pointer-events-none select-none blur-sm")}>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = iconMap[stat.icon as keyof typeof iconMap]
            return (
              <div
                key={index}
                className="bg-card text-card-foreground rounded-lg p-4 shadow-sm border border-border"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground truncate">{stat.title}</p>
                    <h3 className="text-xl sm:text-2xl font-bold mt-1 truncate">{stat.value}</h3>
                  </div>
                  <div className="bg-muted p-3 rounded-full ml-3 flex-shrink-0">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-green-600 dark:text-green-400">{stat.change}</span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Filters and Search */}
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 p-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or contact..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter className="text-muted-foreground w-5 h-5" />
              <select
                className="bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring min-w-0"
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
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-border">
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
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.map((gamer) => (
                  <tr key={gamer.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{gamer.id}</td>
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{gamer.name}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{gamer.contact}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{gamer.totalSlots}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      ₹{gamer.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">₹{gamer.averagePerSlot}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{gamer.promoCodesUsed}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      ₹{gamer.discountAvailed.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      ₹{gamer.netRevenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {gamer.lastVisit && format(new Date(gamer.lastVisit), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        {gamer.membershipTier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[200px] truncate">{gamer.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile-friendly scroll hint */}
          <div className="p-4 text-center text-sm text-muted-foreground border-t border-border sm:hidden">
            Scroll horizontally to view all columns
          </div>
        </div>

      </div>
    </div>
  )
}