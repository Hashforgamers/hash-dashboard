import React from 'react'

import { DashboardLayout } from '../../(layout)/dashboard-layout'
import ManageExtraServices from '../../components/manageextra-service'


const page = () => {
  return (
     <DashboardLayout>
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
           
            <ManageExtraServices/>
           
          </div>
        </DashboardLayout>
  )
}

export default page