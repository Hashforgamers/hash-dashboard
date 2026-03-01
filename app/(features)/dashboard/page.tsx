"use client"

import { DashboardLayout } from "../../(layout)/dashboard-layout"
import { DashboardContent } from "../../components/dashboard-content"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex-1 min-h-screen bg-background">
        <DashboardContent />
      </div>
    </DashboardLayout>
  )
}
