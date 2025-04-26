import React, { useEffect, useState } from 'react';
import { Monitor, Gamepad2, Gamepad, Headphones } from 'lucide-react';
import { jwtDecode } from "jwt-decode";

// Static Payload (Platform Metadata)
const platformMetadata = {
  platforms: [
    {
      name: "PC",
      icon: Monitor,
      color: "#3b82f6",
      lightColor: "#93c5fd",
      bgColor: "#dbeafe",
      type: "pc"
    },
    {
      name: "PS5",
      icon: Gamepad2,
      color: "#a855f7",
      lightColor: "#d8b4fe",
      bgColor: "#f3e8ff",
      type: "ps5"
    },
    {
      name: "Xbox",
      icon: Gamepad,
      color: "#10b981",
      lightColor: "#6ee7b7",
      bgColor: "#d1fae5",
      type: "xbox"
    },
    {
      name: "VR",
      icon: Headphones,
      color: "#f59e0b",
      lightColor: "#fcd34d",
      bgColor: "#fef3c7",
      type: "vr"
    }
  ]
};

export function BookingStats({ refreshSlots, setRefreshSlots }: { refreshSlots: boolean; setRefreshSlots: (prev: boolean) => void; }) {
  // State for dynamic data (from API)
  const [bookingInfo, setBookingInfo] = useState([]);
  const [vendorId, setVendorId] = useState(null);

    // Decode token once when the component mounts
    useEffect(() => {
      const token = localStorage.getItem("jwtToken");

      if (token) {
        const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
        setVendorId(decoded_token.sub.id);
      }
    }, []); // empty dependency, runs once on mount

  useEffect(() => {
    // Fetch dynamic data from API
    const fetchBookingData = async () => {
      try {
        const response = await fetch(`https://hfg-dashboard.onrender.com/api/getConsoles/vendor/${vendorId}`);
        const data = await response.json();
        setBookingInfo(data); // API response is an array of console data
      } catch (error) {
        console.error('Error fetching booking data:', error);
      }
    };

    fetchBookingData();
  }, [vendorId, refreshSlots]); // Re-fetch when vendorId changes

  // Combine static and dynamic data
  const platforms = platformMetadata.platforms.map(metadata => {
    // Filter the API data for the current platform type
    const platformBooking = bookingInfo.filter(b => b.type === metadata.type);

    const total = platformBooking.length; // Number of consoles for this type
    const booked = platformBooking.filter(b => b.status === false).length; // Number of booked consoles

    return {
      ...metadata,
      total,
      booked
    };
  });

  const totalUnits = platforms.reduce((acc, p) => acc + p.total, 0);
  const totalBooked = platforms.reduce((acc, p) => acc + p.booked, 0);
  const [activeTab, setActiveTab] = useState("all");

  const filteredPlatforms = activeTab === "all"
    ? platforms
    : platforms.filter(p => p.name.toLowerCase() === activeTab.toLowerCase());

  return (
    <div className="p-6 h-full">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Available Devices</h2>
          <div className="flex flex-wrap gap-4 mt-2">
            <button
              className={`px-3 py-1 ${activeTab === "all" ? "bg-zinc-800 text-white" : "hover:bg-zinc-800 text-zinc-400"} rounded-md text-sm transition-colors`}
              onClick={() => setActiveTab("all")}
            >
              All Devices
            </button>
            {platforms.map(platform => (
              <button
                key={platform.name}
                className={`px-3 py-1 ${activeTab === platform.name.toLowerCase() ? "bg-zinc-800 text-white" : "hover:bg-zinc-800 text-zinc-400"} rounded-md text-sm transition-colors`}
                onClick={() => setActiveTab(platform.name.toLowerCase())}
              >
                {platform.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {filteredPlatforms.map((platform) => {
            const available = platform.total - platform.booked;
            const bookedPercentage = (platform.booked / platform.total) * 100;
            const Icon = platform.icon;

            return (
              <div key={platform.name} className="bg-white bg-opacity-5 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-full"
                      style={{ backgroundColor: `${platform.bgColor}` }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{ color: platform.color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">{platform.name}</h3>
                    </div>
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: platform.color }}
                  >
                    {Math.round(bookedPercentage)}%
                  </div>
                </div>

                {/* Visual representation with circular progress */}
                <div className="flex flex-col items-center">
                  <div className="relative w-24 h-24">
                    {/* Circular background */}
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#374151"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={platform.color}
                        strokeWidth="8"
                        strokeDasharray={`${bookedPercentage * 2.83} ${(100 - bookedPercentage) * 2.83}`}
                        strokeDashoffset="0"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>

                    {/* Icon in the middle */}
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ color: platform.color }}
                    >
                      <Icon className="w-10 h-10" />
                    </div>
                  </div>

                  {/* Status indicators */}
                  <div className="flex justify-center mt-2 gap-3 text-xs">
                    <div className="flex items-center">
                      <div
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: platform.color }}
                      ></div>
                      <span>{platform.booked}</span>
                    </div>
                    <span>/</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full mr-1 bg-gray-600"></div>
                      <span>{available}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary section */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-medium">Total Availability</h3>
              <p className="text-xs text-zinc-400">{totalUnits - totalBooked} of {totalUnits} units available</p>
            </div>
            <div className="text-sm font-bold">{totalBooked} / {totalUnits}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
