"use client"

import { Suspense } from "react"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import { DashboardContent } from "../../components/dashboard-content"
import HashLoader from "../../components/ui/HashLoader"

export default function DashboardPage() {
  return (
    <DashboardLayout contentScroll="contained">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-transparent lg:overflow-hidden">
        <Suspense fallback={<HashLoader className="py-[42vh]" />}>
          <DashboardContent />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
