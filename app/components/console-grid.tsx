"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const consoles = ["Computer", "PS5", "Xbox", "VR"];

function getHourString(hour: number) {
  return hour < 12 ? `${hour} AM` : hour === 12 ? `${hour} PM` : `${hour - 12} PM`;
}

function getNextHours(count: number) {
  const currentHour = new Date().getHours();
  return Array.from({ length: count }, (_, index) => (currentHour + index) % 24)
    .map(getHourString);
}

export function ConsoleGrid() {
  const [startIndex, setStartIndex] = useState(0);
  const totalHoursToShow = 6; // Number of hours to show in the grid
  const allHours = getNextHours(24); // Full day hours (next 24 hours)
  const visibleHours = allHours.slice(startIndex, startIndex + totalHoursToShow);

  const handlePrevious = () => {
    if (startIndex > 0) {
      setStartIndex((prev) => prev - totalHoursToShow);
    }
  };

  const handleNext = () => {
    if (startIndex + totalHoursToShow < allHours.length) {
      setStartIndex((prev) => prev + totalHoursToShow);
    }
  };

  return (
    <Card className="h-[300px]">
      <CardHeader >
        <CardTitle >Console Availability</CardTitle>
        <div className="flex space-x-2  items-center ">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={startIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={startIndex + totalHoursToShow >= allHours.length}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-auto">
        <div className="grid gap-2">
          {/* Hour Headers */}
          <div className="grid grid-cols-8 gap-2">
            <div className="font-medium text-xs">Time</div>
            {visibleHours.map((hour, index) => (
              <div key={`hour-${index}`} className="text-center font-medium text-xs truncate">
                {hour}
              </div>
            ))}
          </div>

          {/* Console Availability */}
          {consoles.map((console) => (
            <div key={console} className="grid grid-cols-8 gap-2">
              <div className="font-medium text-xs truncate">{console}</div>
              {visibleHours.map((hour, index) => {
                const availability = Math.floor(Math.random() * 100);
                return (
                  <Badge
                    key={`${console}-${hour}`}
                    variant={availability > 50 ? "secondary" : "outline"}
                    className="text-center text-xs w-full"
                  >
                    {availability}
                  </Badge>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
