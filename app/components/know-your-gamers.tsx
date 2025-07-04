"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Users,
  TrendingUp,
  Award,
  Clock,
  Search,
  Filter,
} from "lucide-react";

import { DASHBOARD_URL } from "@/src/config/env";
import { jwtDecode } from "jwt-decode";
import HashLoader from "./ui/HashLoader";

// Define icon mapping
const iconMap = {
  Users,
  TrendingUp,
  Award,
  Clock,
};

// Replace mock data with dynamic API call
export function KnowYourGamers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("all");
  const [gamerData, setGamerData] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<number | null>(null);

  const GAMER_CACHE_KEY = "gamerDataCache";
  const STATS_CACHE_KEY = "gamerStatsCache";
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const POLL_INTERVAL = 1 * 1000; // 1 minute

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []);

  useEffect(() => {
    if (!vendorId) return;

    let pollingInterval: NodeJS.Timeout;

    const loadGamerData = async (isInitial = false) => {
      try {
        const now = Date.now();

        // Try cache first
        const cachedGamer = localStorage.getItem(GAMER_CACHE_KEY);
        const cachedStats = localStorage.getItem(STATS_CACHE_KEY);
        const gamerParsed = cachedGamer ? JSON.parse(cachedGamer) : null;
        const statsParsed = cachedStats ? JSON.parse(cachedStats) : null;

        const isCacheValid = (entry: any) =>
          entry && entry.timestamp && now - entry.timestamp < CACHE_TTL;

        if (isInitial && isCacheValid(gamerParsed) && isCacheValid(statsParsed)) {
          setGamerData(gamerParsed.data);
          setStats(statsParsed.data);
          setLoading(false);
          console.log("Loaded gamer data from cache");
          return;
        }

        // Fetch fresh
        const [gamerRes, statsRes] = await Promise.all([
          fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/knowYourGamer`),
          fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/knowYourGamer/stats`),
        ]);

        const gamerJson = await gamerRes.json();
        const statsJson = await statsRes.json();

        if (Array.isArray(gamerJson)) {
          setGamerData(gamerJson);
          localStorage.setItem(
            GAMER_CACHE_KEY,
            JSON.stringify({ data: gamerJson, timestamp: now })
          );
        }

        const formattedStats = [
          {
            title: "Total Gamers",
            value: statsJson.totalGamers?.toLocaleString() || "0",
            icon: "Users",
            change: statsJson.membersGrowth || "+0%",
            color: "text-blue-600",
            bgColor: "bg-blue-50",
          },
          {
            title: "Average Revenue",
            value: `₹${statsJson.averageRevenue?.toLocaleString() || "0"}`,
            icon: "TrendingUp",
            change: statsJson.revenueGrowth || "+0%",
            color: "text-green-600",
            bgColor: "bg-green-50",
          },
          {
            title: "Premium Members",
            value: statsJson.premiumMembers?.toLocaleString() || "0",
            icon: "Award",
            change: statsJson.membersGrowth || "+0%",
            color: "text-purple-600",
            bgColor: "bg-purple-50",
          },
          {
            title: "Avg. Session Time",
            value: statsJson.avgSessionTime ?? "N/A",
            icon: "Clock",
            change: statsJson.sessionGrowth || "+0%",
            color: "text-orange-600",
            bgColor: "bg-orange-50",
          },
        ];

        setStats(formattedStats);
        localStorage.setItem(
          STATS_CACHE_KEY,
          JSON.stringify({ data: formattedStats, timestamp: now })
        );
      } catch (err) {
        console.error("Error fetching gamer/stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadGamerData(true); // Initial load with cache

    pollingInterval = setInterval(() => loadGamerData(false), POLL_INTERVAL);

    return () => clearInterval(pollingInterval);
  }, [vendorId]);

  const filteredData = gamerData.filter((gamer) => {
    const matchesSearch =
      gamer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gamer.contact.includes(searchTerm);
    const matchesTier =
      selectedTier === "all" ||
      gamer.membershipTier.toLowerCase() === selectedTier.toLowerCase();
    return matchesSearch && matchesTier;
  });


  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = iconMap[stat.icon as keyof typeof iconMap];
          return (
            <div key={index} className="bg-emerald-100 dark:bg-emerald-950 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-full ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-green-500">{stat.change}</span>
                <span className="text-gray-500 ml-1">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or contact..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-5 h-5" />
          <select
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Data Table */}
      <div className="rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
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
                "Notes",
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((gamer) => (
              <tr key={gamer.id}>
                <td className="px-4 py-3 text-sm">{gamer.id}</td>
                <td className="px-4 py-3 text-sm font-medium">{gamer.name}</td>
                <td className="px-4 py-3 text-sm">{gamer.contact}</td>
                <td className="px-4 py-3 text-sm">{gamer.totalSlots}</td>
                <td className="px-4 py-3 text-sm">₹{gamer.totalAmount.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">₹{gamer.averagePerSlot}</td>
                <td className="px-4 py-3 text-sm">{gamer.promoCodesUsed}</td>
                <td className="px-4 py-3 text-sm">₹{gamer.discountAvailed.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">₹{gamer.netRevenue.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">
                  {gamer.lastVisit && format(new Date(gamer.lastVisit), "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium
                    ${gamer.membershipTier === "Platinum"
                      ? "bg-purple-100 text-purple-800"
                      : gamer.membershipTier === "Gold"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {gamer.membershipTier}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{gamer.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
