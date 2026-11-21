"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";

const data = [
  { name: "Pending", value: 30, amount: "₹ 45,000" },
  { name: "Cleared", value: 70, amount: "₹ 105,000" },
];

// const COLORS = ["#10b981", "#34d399"]
const COLORS = ["#34d399", "#10b981"];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-4">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-lg font-bold">{payload[0].payload.amount}</p>
        <p className="text-sm text-muted-foreground">{payload[0].value}% of total</p>
      </div>
    );
  }
  return null;
};

export function SettlementChart() {

  const handleDownload = () => {
    console.log("Downloading report...");
  };

  const totalAmount = data.reduce((acc, item) => {
    return acc + parseInt(item.amount.replace(/[₹,]/g, ""), 10);
  }, 0);


  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div>
          <CardTitle className="text-2xl font-bold">Settlement Overview</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total amount: ₹ {new Intl.NumberFormat("en-IN").format(totalAmount)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {data.map((item) => (
            <div key={item.name} className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{item.name}</p>
              <p className="text-2xl font-bold">{item.amount}</p>
              <div className="text-sm text-muted-foreground">
                {item.value}% of total
              </div>
            </div>
          ))}
          <div className="relative h-[250px] col-span-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  innerRadius={70}
                  outerRadius={120}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="col-span-3">
            <div className="flex justify-center gap-6">
              {data.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
