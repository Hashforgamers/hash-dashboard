import React from 'react';
import { Monitor, Gamepad2, Gamepad, Headphones } from 'lucide-react';

const platforms = [
  {
    name: "PC",
    icon: Monitor,
    total: 50,
    booked: 30,
    color: "#3b82f6", // blue-500
    lightColor: "#93c5fd", // blue-300
    bgColor: "#dbeafe", // blue-100
  },
  {
    name: "PS5",
    icon: Gamepad2,
    total: 30,
    booked: 25,
    color: "#a855f7", // purple-500
    lightColor: "#d8b4fe", // purple-300
    bgColor: "#f3e8ff", // purple-100
  },
  {
    name: "Xbox",
    icon: Gamepad,
    total: 25,
    booked: 15,
    color: "#10b981", // emerald-500
    lightColor: "#6ee7b7", // emerald-300
    bgColor: "#d1fae5", // emerald-100
  },
  {
    name: "VR",
    icon: Headphones,
    total: 20,
    booked: 10,
    color: "#f59e0b", // amber-500
    lightColor: "#fcd34d", // amber-300
    bgColor: "#fef3c7", // amber-100
  },
];

export function BookingStats() {
  const totalUnits = platforms.reduce((acc, p) => acc + p.total, 0);
  const totalBooked = platforms.reduce((acc, p) => acc + p.booked, 0);
  const [activeTab, setActiveTab] = React.useState("all");

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
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="text-lg font-bold text-emerald-500">{totalUnits - totalBooked}</div>
                <div className="text-xs text-zinc-400">Available</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-lg font-bold text-amber-500">{totalBooked}</div>
                <div className="text-xs text-zinc-400">Occupied</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-lg font-bold">{totalUnits}</div>
                <div className="text-xs text-zinc-400">Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}