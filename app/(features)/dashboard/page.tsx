"use client"

import { DashboardLayout } from "../../(layout)/dashboard-layout"
import { DashboardContent } from "../../components/dashboard-content"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-1 bg-background">
        <DashboardContent />
      </div>
    </DashboardLayout>
  )
}
