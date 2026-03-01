"use client"

import { Tabs, TabsContent } from "@/components/ui/tabs"
import { DashboardContent } from "../../components/dashboard-content"
import { DashboardLayout } from "../../(layout)/dashboard-layout"
import RapidBookings from "../../components/rapid-bookings"
import { useState } from "react"
import { motion } from "framer-motion"
import { Gamepad2, Zap } from "lucide-react"

export default function DashboardPage1() {
  const [activeTab, setActiveTab] = useState("gaming-cafe")

  return (
    <DashboardLayout>
      <div className="flex-1 min-h-screen bg-background p-3 sm:p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="h-full premium-card rounded-2xl border p-4 sm:p-6"
        >
          <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="premium-heading text-2xl font-bold text-foreground sm:text-3xl">Operations Dashboard</h1>
              <p className="premium-subtle text-sm sm:text-base">
                Track cafe performance, bookings, and live activity in one place.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-border/70 bg-muted/30 p-1.5">
              <button
                onClick={() => setActiveTab("gaming-cafe")}
                className={`premium-pill rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${
                  activeTab === "gaming-cafe" ? "premium-pill-active" : ""
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  Gaming Cafe
                </span>
              </button>
              <button
                onClick={() => setActiveTab("product")}
                className={`premium-pill rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${
                  activeTab === "product" ? "premium-pill-active" : ""
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Rapid Booking
                </span>
              </button>
            </div>
          </div>

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
                  className="h-full rounded-xl border border-border/70 bg-background/80 p-4 md:p-6"
                >
                  <div className="max-w-7xl mx-auto">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h2 className="premium-heading mb-2 text-2xl font-bold text-foreground md:text-3xl">Rapid Booking</h2>
                        <p className="premium-subtle">Quick booking management for gaming sessions.</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("gaming-cafe")}
                        className="premium-pill rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Gamepad2 className="h-4 w-4" />
                          Gaming Cafe
                        </span>
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
