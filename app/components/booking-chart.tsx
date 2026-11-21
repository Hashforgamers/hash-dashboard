"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  { day: "Mon", hash: 15, direct: 9 },
  { day: "Tue", hash: 20, direct: 12 },
  { day: "Wed", hash: 18, direct: 10 },
  { day: "Thu", hash: 25, direct: 11 },
  { day: "Fri", hash: 30, direct: 15 },
  { day: "Sat", hash: 35, direct: 17 },
  { day: "Sun", hash: 28, direct: 20 },
]

export function BookingChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings per Day</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              {/* <Bar dataKey="bookings" fill="#10b981" />
              <Bar dataKey="bookings" fill="#10b981" /> */}
              <Bar dataKey="hash" name="Hash Bookings" fill="#10b981" />
              <Bar dataKey="direct" name="Direct Bookings" fill="#9c9b9a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

