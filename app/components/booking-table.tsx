"use client"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useState } from "react"

const bookings = [
  {
    id: "1",
    time: "10:00 AM",
    system: "PC1",
    user: "User 1",
    status: "Not played",
  },
  {
    id: "2",
    time: "11:00 AM",
    system: "PS5-1",
    user: "User 2",
    status: "Playing",
  },
  {
    id: "3",
    time: "12:00 PM",
    system: "Xbox-1",
    user: "User 3",
    status: "Played",
  },
  {
    id: "4",
    time: "1:00 PM",
    system: "PC2",
    user: "User 4",
    status: "Not played",
  },
  {
    id: "5",
    time: "2:00 PM",
    system: "PS5-2",
    user: "User 5",
    status: "Playing",
  },
  {
    id: "6",
    time: "3:00 PM",
    system: "Xbox-2",
    user: "User 6",
    status: "Played",
  },
  {
    id: "7",
    time: "4:00 PM",
    system: "PC3",
    user: "User 7",
    status: "Not played",
  },
]

export function BookingTable() {
  const [filter, setFilter] = useState("")

  // Filter bookings based on the input filter value
  const filteredBookings = bookings.filter(
    (booking) =>
      booking.system.toLowerCase().includes(filter.toLowerCase()) ||
      booking.user.toLowerCase().includes(filter.toLowerCase()) ||
      booking.status.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="w-full space-y-4">
      {/* Filter Input */}
      <div className="w-full mb-4">
        <input
          type="text"
          placeholder="Filter by System, User, or Status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border p-2 w-full rounded-md"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow-md">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Booking Time</TableHead>
              <TableHead>System Number</TableHead>
              <TableHead>User Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Timer</TableHead>
              <TableHead>Timer</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody
            className="mt-4 max-h-60 overflow-y-auto"
            style={{ height: "300px" }} // Adjust the height for scroll effect
          >
            {filteredBookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{booking.time}</TableCell>
                <TableCell>{booking.system}</TableCell>
                <TableCell>{booking.user}</TableCell>
                <TableCell>{booking.status}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={booking.status !== "Not played"}
                  >
                    Start
                  </Button>
                </TableCell>
                <TableCell>00:00:00</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
