import React from 'react'
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import SlotManagement from '@/app/components/newSlot'


const page = () => {
  return (
     <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* <h1 className="text-3xl font-bold">Manage Booking</h1> */}
        <SlotManagement/>
      </div>
    </DashboardLayout>
  )
}

export default page
