import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Monitor, Gamepad2, Gamepad, Headphones } from 'lucide-react';

export function BookingStats({ bookingStats }) {
  const platforms = [
    {
      name: "PC",
      icon: Monitor,
      total: 50,
      booked: bookingStats.pcBookings || 0, // Assuming `pcBookings` will be available in the bookingStats
      colorClass: "bg-blue-100 dark:bg-blue-900/20",
      iconColorClass: "text-blue-500",
      progressColorClass: "bg-blue-500",
    },
    {
      name: "PS5",
      icon: Gamepad2,
      total: 30,
      booked: bookingStats.ps5Bookings || 0, // Similar assumptions for other platforms
      colorClass: "bg-indigo-100 dark:bg-indigo-900/20",
      iconColorClass: "text-indigo-500",
      progressColorClass: "bg-indigo-500",
    },
    {
      name: "Xbox",
      icon: Gamepad,
      total: 25,
      booked: bookingStats.xboxBookings || 0, // Adjust based on your actual data structure
      colorClass: "bg-emerald-100 dark:bg-emerald-900/20",
      iconColorClass: "text-emerald-500",
      progressColorClass: "bg-emerald-500",
    },
    {
      name: "VR",
      icon: Headphones,
      total: 20,
      booked: bookingStats.vrBookings || 0, // Adjust for VR as well
      colorClass: "bg-amber-100 dark:bg-amber-900/20",
      iconColorClass: "text-amber-500",
      progressColorClass: "bg-amber-500",
    },
  ];

  const totalUnits = platforms.reduce((acc, p) => acc + p.total, 0);
  const totalBooked = platforms.reduce((acc, p) => acc + p.booked, 0);

  return (
    <div className="p-6 h-full">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">Gaming Status</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalBooked} of {totalUnits} units booked
          </p>
        </div>

        <div className="space-y-8">
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
                      <p className="text-sm text-muted-foreground">
                        {available} available
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {platform.booked}/{platform.total}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(bookedPercentage)}% booked
                    </p>
                  </div>
                </div>
                <Progress value={bookedPercentage} className="h-2">
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
