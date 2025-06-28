import React, { useEffect, useState } from 'react';
import { Monitor, Gamepad2, Gamepad, Headphones } from 'lucide-react';
import { jwtDecode } from "jwt-decode";
import { DASHBOARD_URL } from '@/src/config/env';

const platformMetadata = {
  platforms: [
    {
      name: "PC",
      icon: Monitor,
      color: "#3b82f6",
      bgColor: "#dbeafe",
      type: "pc"
    },
    {
      name: "PS5",
      icon: Gamepad2,
      color: "#a855f7",
      bgColor: "#f3e8ff",
      type: "ps5"
    },
    {
      name: "Xbox",
      icon: Gamepad,
      color: "#10b981",
      bgColor: "#d1fae5",
      type: "xbox"
    },
    {
      name: "VR",
      icon: Headphones,
      color: "#f59e0b",
      bgColor: "#fef3c7",
      type: "vr"
    }
  ]
};

export function BookingStats({ refreshSlots, setRefreshSlots }) {
  const [bookingInfo, setBookingInfo] = useState([]);
  const [vendorId, setVendorId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      const decoded_token = jwtDecode(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []);

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        const response = await fetch(`${DASHBOARD_URL}/api/getConsoles/vendor/${vendorId}`);
        const data = await response.json();
        setBookingInfo(data);
      } catch (error) {
        console.error('Error fetching booking data:', error);
      }
    };

    if (vendorId) fetchBookingData();
  }, [vendorId, refreshSlots]);

  const platforms = platformMetadata.platforms.map(metadata => {
    const platformBooking = bookingInfo.filter(b => b.type === metadata.type);
    const total = platformBooking.length;
    const booked = platformBooking.filter(b => b.status === false).length;
    return { ...metadata, total, booked };
  });

  const totalUnits = platforms.reduce((acc, p) => acc + p.total, 0);
  const totalBooked = platforms.reduce((acc, p) => acc + p.booked, 0);

  const filteredPlatforms = activeTab === "all"
    ? platforms
    : platforms.filter(p => p.name.toLowerCase() === activeTab.toLowerCase());

  return (
    <div className="p-4 space-y-4 w-full h-full">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {["all", ...platforms.map(p => p.name.toLowerCase())].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black'
                  : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {filteredPlatforms.map((platform) => {
          const available = platform.total - platform.booked;
          const bookedPercentage = platform.total
            ? Math.round((platform.booked / platform.total) * 100)
            : 0;
          const Icon = platform.icon;

          return (
            <div key={platform.name} className="bg-white dark:bg-zinc-900 rounded-lg p-3 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="p-1.5 rounded-full"
                    style={{ backgroundColor: platform.bgColor }}
                  >
                    <Icon className="w-4 h-4" style={{ color: platform.color }} />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-100">
                    {platform.name}
                  </span>
                </div>
                <span className="text-xs font-bold" style={{ color: platform.color }}>
                  {bookedPercentage}%
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${bookedPercentage}%`, backgroundColor: platform.color }}
                />
              </div>

              <div className="mt-2 text-xs flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Booked: {platform.booked}</span>
                <span>Free: {available}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
        <span>Total Available: <strong className="text-zinc-800 dark:text-zinc-100">{totalUnits - totalBooked}</strong> of {totalUnits}</span>
        <span className="font-medium">{totalBooked} / {totalUnits} booked</span>
      </div>
    </div>
  );
}