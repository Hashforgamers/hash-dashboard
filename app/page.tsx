"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardContent } from "./components/dashboard-content";
import { DashboardLayout } from "./(layout)/dashboard-layout";
import RapidBookings from "./components/rapid-bookings";
import { TopBar } from "./components/top-bars";
import LogIn from "./(features)/login/page";

export default function DashboardPage() {
  return (
    <LogIn />
  );
}
