"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardContent } from "../components/dashboard-content";
import { DashboardLayout } from "../components/dashboard-layout";
import RapidBookings from "../components/rapid-bookings";
import { TopBar } from "../components/top-bars";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage1() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Tabs defaultValue="gaming-cafe" className="space-y-4">
          <TabsList>
            <TabsTrigger value="gaming-cafe">
              Gaming Cafe Management
            </TabsTrigger>
            <TabsTrigger value="product">Rapid Booking</TabsTrigger>
          </TabsList>
          <TabsContent value="gaming-cafe" className="space-y-4">
            <DashboardContent />
          </TabsContent>
          <TabsContent value="product" className="space-y-4">
            <RapidBookings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    // </ProtectedRoute>
  );
}
