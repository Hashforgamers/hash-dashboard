"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardContent } from "./components/dashboard-content";
import { DashboardLayout } from "./components/dashboard-layout";
import RapidBookings from "./components/rapid-bookings";
import { TopBar } from "./components/top-bars";
import LogIn from "./login/page";

export default function DashboardPage() {
  return (
    <LogIn />
  );
}
