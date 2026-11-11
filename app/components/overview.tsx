"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts"
import { StarRating } from "./star-rating"

const data = [
  { revenue: 1200 },
  { revenue: 2100 },
  { revenue: 1800 },
  { revenue: 2400 },
  { revenue: 2800 },
  { revenue: 1900 },
  { revenue: 2700 },
]

export function Overview() {
  const totalRating = 4.5
  const totalReviews = 1234

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Earning Block */}
      <Card className="md:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Earning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$150,000</div>
        </CardContent>
      </Card>

      {/* Revenue Trend Block */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[150px]"> {/* Increased height for better graph visibility */}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>


    </div>
  )
}
