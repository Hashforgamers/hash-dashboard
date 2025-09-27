"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Gamepad2, Fan, BatteryCharging, Dot, MoreVertical, Plus, Monitor, MonitorPlay } from "lucide-react"

type PillColor = "green" | "blue" | "purple" | "yellow" | "red"

function SlotPill({
  label,
  color,
  icon: Icon,
}: {
  label: string
  color: PillColor
  icon?: React.ComponentType<{ className?: string }>
}) {
  const colorClasses: Record<PillColor, string> = {
    green: "bg-emerald-500/90 text-white ring-1 ring-emerald-400/20 shadow-sm shadow-emerald-500/25",
    blue: "bg-blue-500/90 text-white ring-1 ring-blue-400/20 shadow-sm shadow-blue-500/25", 
    purple: "bg-violet-500/90 text-white ring-1 ring-violet-400/20 shadow-sm shadow-violet-500/25",
    yellow: "bg-amber-500/90 text-white ring-1 ring-amber-400/20 shadow-sm shadow-amber-500/25",
    red: "bg-red-500/90 text-white ring-1 ring-red-400/20 shadow-sm shadow-red-500/25",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold",
        "transition-all duration-200 hover:scale-105",
        colorClasses[color],
      )}
    >
      {Icon ? <Icon className="h-3 w-3 opacity-90" /> : null}
      {label}
    </span>
  )
}

function SegmentedButton({
  children,
  active = false,
  icon: Icon,
  ariaLabel,
}: {
  children: React.ReactNode
  active?: boolean
  icon?: React.ComponentType<{ className?: string }>
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium",
        "transition-all duration-200 hover:scale-105",
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
          : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600",
      )}
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}

function TopBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Slot Management</h1>
        <p className="text-sm text-slate-400 mt-1">Manage and monitor console bookings.</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          className={cn(
            "rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25",
            "px-6 py-2.5 font-semibold transition-all duration-200 hover:scale-105"
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600"
        >
          <MoreVertical className="h-4 w-4 text-slate-300" />
        </Button>
      </div>
    </div>
  )
}

function ConsoleFilter() {
  return (
    <Card className="mt-6 rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
      <div className="flex flex-col gap-4">
        <span className="text-sm font-medium text-slate-300">Select Console</span>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedButton active icon={Dot} ariaLabel="Show all consoles">
            All
          </SegmentedButton>
          <SegmentedButton icon={MonitorPlay} ariaLabel="PlayStation 5">
            PS5
          </SegmentedButton>
          <SegmentedButton icon={Gamepad2} ariaLabel="Xbox Series X">
            Xbox Series X
          </SegmentedButton>
          <SegmentedButton icon={Monitor} ariaLabel="PC">
            PC
          </SegmentedButton>
        </div>
      </div>
    </Card>
  )
}

function TimeHeader() {
  const times = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]
  return (
    <div className="grid grid-cols-[120px_repeat(9,1fr)] items-center gap-4 px-6 pb-4">
      <div className="text-sm font-medium text-slate-400" />
      {times.map((t) => (
        <div key={t} className="text-sm font-semibold text-slate-200 text-center">
          {t}
        </div>
      ))}
    </div>
  )
}

function GridRow({
  date,
  cells,
}: {
  date: string
  cells: Array<React.ReactNode>
}) {
  return (
    <div className="grid grid-cols-[120px_repeat(9,1fr)] items-stretch gap-4 px-6">
      <div className="flex items-center text-sm font-semibold text-slate-200 bg-slate-800/50 rounded-lg px-3 py-2">
        {date}
      </div>
      {cells.map((content, idx) => (
        <div
          key={idx}
          className={cn(
            "min-h-16 rounded-lg border border-slate-700 bg-slate-800/30 backdrop-blur-sm",
            "flex items-center justify-center px-3 py-2",
            "hover:bg-slate-700/50 transition-colors duration-200"
          )}
        >
          <div className="flex flex-wrap items-center justify-center gap-2">{content}</div>
        </div>
      ))}
    </div>
  )
}

function ScheduleGrid() {
  // Static demo data matching the screenshot with proper colors
  const rows = [
    {
      date: "21/09",
      cells: [
        <SlotPill key="0" label="C-19" color="green" icon={BatteryCharging} />,
        <SlotPill key="1" label="C-05" color="blue" icon={Gamepad2} />,
        <SlotPill key="2" label="C-05" color="blue" icon={Gamepad2} />,
        <span key="3" className="text-red-400 font-bold text-lg">×</span>,
        <SlotPill key="4" label="C-08" color="yellow" icon={Fan} />,
        <span key="5" className="text-red-400 font-bold text-lg">×</span>,
        <SlotPill key="6" label="C-08" color="yellow" icon={Fan} />,
        <span key="7" className="text-red-400 font-bold text-lg">×</span>,
        <span key="8" />,
      ],
    },
    {
      date: "22/09",
      cells: [
        <span key="0" className="text-red-400 font-bold text-lg">×</span>,
        <SlotPill key="1" label="C-19" color="green" icon={BatteryCharging} />,
        <SlotPill key="2" label="C-05" color="blue" icon={Gamepad2} />,
        <span key="3" className="text-red-400 font-bold text-lg">×</span>,
        <span key="4" />,
        <SlotPill key="5" label="C-05" color="blue" icon={Gamepad2} />,
        <span key="6" className="text-red-400 font-bold text-lg">×</span>,
        <SlotPill key="7" label="C-19" color="green" icon={BatteryCharging} />,
        <span key="8" />,
      ],
    },
    {
      date: "23/09",
      cells: [
        <span key="0" className="text-red-400 font-bold text-lg">×</span>,
        <SlotPill key="1" label="C-19" color="green" icon={BatteryCharging} />,
        <SlotPill key="2" label="C-10" color="purple" icon={Fan} />,
        <SlotPill key="3" label="C-10" color="purple" icon={Fan} />,
        <SlotPill key="4" label="C-05" color="blue" icon={Gamepad2} />,
        <span key="5" className="text-red-400 font-bold text-lg">×</span>,
        <SlotPill key="6" label="C-10" color="purple" icon={Fan} />,
        <SlotPill key="7" label="C-10" color="purple" icon={Fan} />,
        <span key="8" />,
      ],
    },
    {
      date: "24/09",
      cells: [
        <SlotPill key="0" label="C-05" color="blue" icon={Gamepad2} />,
        <span key="1" className="text-red-400 font-bold text-lg">×</span>,
        <SlotPill key="2" label="C-19" color="green" icon={BatteryCharging} />,
        <span key="3" className="text-red-400 font-bold text-lg">×</span>,
        <SlotPill key="4" label="C-08" color="yellow" icon={Fan} />,
        <span key="5" />,
        <SlotPill key="6" label="C-08" color="yellow" icon={Fan} />,
        <span key="7" />,
        <span key="8" />,
      ],
    },
    {
      date: "25/09",
      cells: [
        <span key="0" className="text-red-400 font-bold text-lg">×</span>,
        <SlotPill key="1" label="C-05" color="blue" icon={Gamepad2} />,
        <SlotPill key="2" label="C-08" color="yellow" icon={Fan} />,
        <span key="3" />,
        <SlotPill key="4" label="C-19" color="green" icon={BatteryCharging} />,
        <SlotPill key="5" label="C-05" color="blue" icon={Gamepad2} />,
        <span key="6" className="text-red-400 font-bold text-lg">×</span>,
        <SlotPill key="7" label="C-08" color="yellow" icon={Fan} />,
        <span key="8" />,
      ],
    },
  ]

  return (
    <Card className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/30 backdrop-blur-sm overflow-hidden">
      <div className="rounded-2xl">
        <div className="border-b border-slate-700 pt-6">
          <TimeHeader />
        </div>

        <div className="flex flex-col gap-4 py-6">
          {rows.map((r) => (
            <GridRow key={r.date} date={r.date} cells={r.cells} />
          ))}
        </div>
      </div>
    </Card>
  )
}

function SelectedBookings() {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold tracking-tight text-white">Selected Slot Bookings</h2>

      <Card className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/30 backdrop-blur-sm">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-700/50 text-slate-200">
                <th className="px-6 py-4 text-left font-semibold">Booking ID</th>
                <th className="px-6 py-4 text-left font-semibold">Name</th>
                <th className="px-6 py-4 text-left font-semibold">Contact Number</th>
                <th className="px-6 py-4 text-left font-semibold">Email ID</th>
                <th className="px-6 py-4 text-left font-semibold">Meal Selected</th>
                <th className="px-6 py-4 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 font-semibold text-blue-400">#628</td>
                <td className="px-6 py-4 text-slate-200">Raj</td>
                <td className="px-6 py-4 text-slate-300">5845879555</td>
                <td className="px-6 py-4 text-slate-300">raj@gmail.com</td>
                <td className="px-6 py-4 text-slate-300">1-Coc</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      className="text-emerald-400 hover:text-emerald-300 transition-colors p-1 rounded-md hover:bg-emerald-500/10"
                      aria-label="Edit booking"
                      title="Edit"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                    <button
                      className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-md hover:bg-red-500/10"
                      aria-label="Delete booking"
                      title="Delete"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}

export default function SlotManagement() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto w-full max-w-[1400px] p-6 md:p-8">
        <TopBar />
        <ConsoleFilter />
        <ScheduleGrid />
        <SelectedBookings />
      </div>
    </main>
  )
}
