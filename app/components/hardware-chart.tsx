"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  { name: "PC", value: 40 },
  { name: "PS5", value: 25 },
  { name: "Xbox", value: 20 },
  { name: "VR", value: 15 },
]

export function HardwareChart() {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" />
        <Tooltip />
        <Bar dataKey="value" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  )
}

