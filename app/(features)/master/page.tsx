"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DASHBOARD_URL } from '@/src/config/env';

const COLORS = ["#4CAF50", "#FFC107", "#03A9F4"];
const allCafeOptions = ["Master Analytics", "Cafe A", "Cafe B", "Cafe C"];
const reportTypes = ["Yearly", "Monthly", "Weekly"];

export default function MasterAnalyticsPage() {
  const router = useRouter();
  const [selectedCafe, setSelectedCafe] = useState("Master Analytics");
  const [reportType, setReportType] = useState("Monthly");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = localStorage.getItem("vendor_login_email");

    if (!email) {
      console.error("No email found in localStorage");
      setLoading(false);
      return;
    }

    fetch(`${DASHBOARD_URL}/api/vendor/master?email_id=${email}`)
      .then((res) => res.json())
      .then((data) => {
        setAnalyticsData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch analytics:", error);
        setLoading(false);
      });
  }, []);

  if (loading || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <p>Loading analytics...</p>
      </div>
    );
  }

  const data = analyticsData[reportType];

  return (
    <div className="p-6 h-screen overflow-hidden bg-gradient-to-br from-gray-950 to-gray-900 text-white">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/select-cafe")}
            className="hover:text-blue-400 transition"
            title="Go Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold tracking-wide">
            📊 {selectedCafe} - {reportType} Report
          </h1>
        </div>

        <div className="flex gap-4">
          <Select value={selectedCafe} onValueChange={setSelectedCafe}>
            <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select Cafe" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 text-white">
              {allCafeOptions.map((cafe) => (
                <SelectItem key={cafe} value={cafe}>
                  {cafe}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select Report" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 text-white">
              {reportTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <Card className="bg-gray-900 text-white col-span-2">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">🏦 Revenue by Cafe</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.revenueByCafe}>
                <XAxis dataKey="cafe" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#4CAF50" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 text-white col-span-2">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">🎟️ Bookings per Cafe</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.bookingsByCafe}>
                <XAxis dataKey="cafe" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#03A9F4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 text-white col-span-2">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">🎮 Top Games - {selectedCafe}</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.topGames[selectedCafe]}>
                <XAxis dataKey="game" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="plays" fill="#FFC107" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 text-white col-span-2">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-2">💳 Payment Mode Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.paymentModes[selectedCafe]}
                  dataKey="count"
                  nameKey="mode"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {data.paymentModes[selectedCafe].map((entry, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
