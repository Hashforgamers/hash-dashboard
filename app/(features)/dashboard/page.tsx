"use client"

import { DashboardLayout } from "../../(layout)/dashboard-layout"
import { DashboardContent } from "../../components/dashboard-content"

export default function DashboardPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-background lg:overflow-hidden">
        <DashboardContent />
      </div>
    </DashboardLayout>
  )
}
