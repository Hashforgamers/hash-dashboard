"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Users,
  TrendingUp,
  Award,
  Clock,
  Search,
  Filter,
  Download
} from 'lucide-react';

const mockData = [
  {
    id: 1,
    name: "John Doe",
    contact: "9876543210",
    totalSlots: 45,
    totalAmount: 7500,
    averagePerSlot: 167,
    promoCodesUsed: 3,
    discountAvailed: 1200,
    netRevenue: 6300,
    lastVisit: "2025-03-01",
    membershipTier: "Gold",
    notes: "Frequent player"
  },
  {
    id: 2,
    name: "Jane Smith",
    contact: "9876543211",
    totalSlots: 25,
    totalAmount: 4200,
    averagePerSlot: 168,
    promoCodesUsed: 2,
    discountAvailed: 800,
    netRevenue: 3400,
    lastVisit: "2025-02-28",
    membershipTier: "Silver",
    notes: "Casual player"
  },
  {
    id: 3,
    name: "Alex Roy",
    contact: "9876543212",
    totalSlots: 60,
    totalAmount: 10500,
    averagePerSlot: 175,
    promoCodesUsed: 5,
    discountAvailed: 2000,
    netRevenue: 8500,
    lastVisit: "2025-03-02",
    membershipTier: "Platinum",
    notes: "Loyal customer"
  }
];

const statsCards = [
  {
    title: "Total Gamers",
    value: "2,549",
    icon: Users,
    change: "+12%",
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    title: "Average Revenue",
    value: "₹1,250",
    icon: TrendingUp,
    change: "+8%",
    color: "text-green-600",
    bgColor: "bg-green-50"
  },
  {
    title: "Premium Members",
    value: "486",
    icon: Award,
    change: "+15%",
    color: "text-purple-600",
    bgColor: "bg-purple-50"
  },
  {
    title: "Avg. Session Time",
    value: "2.5 hrs",
    icon: Clock,
    change: "+5%",
    color: "text-orange-600",
    bgColor: "bg-orange-50"
  }
];

export function KnowYourGamers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState("all");

  const filteredData = mockData.filter(gamer => {
    const matchesSearch = gamer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gamer.contact.includes(searchTerm);
    const matchesTier = selectedTier === "all" || gamer.membershipTier.toLowerCase() === selectedTier.toLowerCase();
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div key={index} className="bg-emerald-100 dark:bg-emerald-950  rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-full ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-500">{stat.change}</span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          </div>
        ))}
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
          <thead >
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
                "Notes"
              ].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map((gamer) => (
              <tr key={gamer.id} >
                <td className="px-4 py-3 text-sm">{gamer.id}</td>
                <td className="px-4 py-3 text-sm font-medium">{gamer.name}</td>
                <td className="px-4 py-3 text-sm">{gamer.contact}</td>
                <td className="px-4 py-3 text-sm">{gamer.totalSlots}</td>
                <td className="px-4 py-3 text-sm">₹{gamer.totalAmount.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">₹{gamer.averagePerSlot}</td>
                <td className="px-4 py-3 text-sm">{gamer.promoCodesUsed}</td>
                <td className="px-4 py-3 text-sm">₹{gamer.discountAvailed.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">₹{gamer.netRevenue.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">{format(new Date(gamer.lastVisit), 'dd MMM yyyy')}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium
                    ${gamer.membershipTier === 'Platinum' ? 'bg-purple-100 text-purple-800' :
                      gamer.membershipTier === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'}`}>
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