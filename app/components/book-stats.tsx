import { Progress } from "@/components/ui/progress";
import { Monitor, Gamepad2, Gamepad, Headphones } from 'lucide-react';

const platforms = [
  {
    name: "PC",
    icon: Monitor,
    total: 50,
    booked: 30,
    colorClass: "bg-blue-500/10",
    iconColorClass: "text-blue-500",
    progressColorClass: "bg-blue-500",
  },
  {
    name: "PS5",
    icon: Gamepad2,
    total: 30,
    booked: 25,
    colorClass: "bg-purple-500/10",
    iconColorClass: "text-purple-500",
    progressColorClass: "bg-purple-500",
  },
  {
    name: "Xbox",
    icon: Gamepad,
    total: 25,
    booked: 15,
    colorClass: "bg-emerald-500/10",
    iconColorClass: "text-emerald-500",
    progressColorClass: "bg-emerald-500",
  },
  {
    name: "VR",
    icon: Headphones,
    total: 20,
    booked: 10,
    colorClass: "bg-amber-500/10",
    iconColorClass: "text-amber-500",
    progressColorClass: "bg-amber-500",
  },
];

export function BookingStats() {
  const totalUnits = platforms.reduce((acc, p) => acc + p.total, 0);
  const totalBooked = platforms.reduce((acc, p) => acc + p.booked, 0);

  return (
    <div className="p-6 h-full">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">Available Devices</h2>
          <div className="flex gap-4 mt-2">
            <button className="px-3 py-1 bg-zinc-800 text-white rounded-md text-sm">Computers</button>
            <button className="px-3 py-1 hover:bg-zinc-800 text-zinc-400 rounded-md text-sm">PS5</button>
            <button className="px-3 py-1 hover:bg-zinc-800 text-zinc-400 rounded-md text-sm">Xbox</button>
          </div>
        </div>

        <div className="space-y-6">
          {platforms.map((platform) => {
            const available = platform.total - platform.booked;
            const bookedPercentage = (platform.booked / platform.total) * 100;
            const Icon = platform.icon;

            return (
              <div key={platform.name} className="space-y-2">
                <div className="flex items-center justify-between"> 
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${platform.colorClass}`}>
                      <Icon className={`w-5 h-5 ${platform.iconColorClass}`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{platform.name}</h3>
                      <p className="text-sm text-zinc-400">
                        {available} available
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {platform.booked}/{platform.total}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {Math.round(bookedPercentage)}% booked
                    </p>
                  </div>
                </div>
                <Progress value={bookedPercentage} className="h-2 bg-zinc-800">
                  <div
                    className={`h-full ${platform.progressColorClass} transition-all`}
                    style={{ width: `${bookedPercentage}%` }}
                  />
                </Progress>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}