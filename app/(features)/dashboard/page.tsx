"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardContent } from "../../components/dashboard-content"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import RapidBookings from "../../components/rapid-bookings"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Gamepad2 } from 'lucide-react'

export default function DashboardPage1() {
  const [activeTab, setActiveTab] = useState("gaming-cafe")

  return (
    <DashboardLayout>
      <div className="flex-1 min-h-screen bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="flex-1">
              <TabsContent value="gaming-cafe" className="mt-0 h-full border-0 p-0">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="h-full"
                >
                  <DashboardContent activeTab={activeTab} setActiveTab={setActiveTab} />
                </motion.div>
              </TabsContent>

              <TabsContent value="product" className="mt-0 h-full border-0 p-0 bg-background">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="h-full bg-background p-4 md:p-6"
                >
                  <div className="max-w-7xl mx-auto">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Rapid Booking</h1>
                        <p className="text-muted-foreground">Quick booking management for gaming sessions</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("gaming-cafe")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                      >
                        <Gamepad2 className="w-4 h-4" />
                        Gaming Cafe
                      </button>
                    </div>
                    <RapidBookings />
                  </div>
                </motion.div>
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
