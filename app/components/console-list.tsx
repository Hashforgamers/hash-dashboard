"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Edit,
  Trash2,
  Monitor,
  Gamepad,
  Tv,
  Headset,
  Cpu,
  Building2,
  CpuIcon as Gpu,
  MemoryStickIcon as Memory,
  HardDrive,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import axios from "axios";

interface ConsoleListProps {
  onEdit: (console: any) => void;
}
export function ConsoleList({ onEdit }: ConsoleListProps) {
  const [data, setdata] = useState([]);


  useEffect(() => {
    const fetch_data = async () => {
      try {
        const response = await axios.get(
          "https://hfg-dashboard.onrender.com/api/getConsoles/vendor/1"
        );
        if (!response) {
          console.log("something went Wrong while fetching the data");
        } else {
          setdata(response?.data);
        }
      } catch (error) {
        console.error("error ocuurs",error);
      }
    };

     fetch_data(); //function call here to fetch the data
  }, []);

  const consolelistdata = data.map((item: any) => ({
    id: item.id,
    type: item.type || "PC",
    name: item.name || "Unknown Console",
    number: item.number || "N/A",
    icon:
      item.type === "ps5"
        ? Monitor
        : item.type === "pc"
        ? Cpu
        : item.type === "xbox"
        ? Gamepad
        : item.type == "vr"
        ? Headset
        : "none",
    brand: item.brand || "Unknown Brand",
    processor: item.processor || "N/A",
    gpu: item.gpu || "N/A",
    ram: item.ram || "N/A",
    storage: item.storage || "N/A",
    status: item.status || "Unknown",
  }));

  const handleDelete = async (id: number): Promise<void> => {
    try {
       const response = await axios.delete(
        `https://hfg-dashboard.onrender.com/api/console/1/${id}`
      );
      if (!response) {
        console.log("something went wrong while deleting the data");
      } else {
        console.log(response.data.message);
        setdata((prevData) => prevData.filter((item: any) => item.id !== id));
        
      }
    } catch (error) {
      console.log("something while wrong to delete the data", error);
    }
  };

  const getStatusVariant = (status: boolean) => {
    switch (status) {
      case true:
        return "success";
      default:
        return "warning";
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {consolelistdata?.map((console) => (
        <motion.div key={console.id} variants={item}>
          <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="flex flex-col h-full p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-primary/10 p-2.5 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <console.icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">
                    {console.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {console.number}
                  </p>
                </div>
              </div>

              <div className="flex-grow space-y-2.5 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Brand</span>
                  </div>
                  <span className="font-medium truncate">{console.brand}</span>

                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">CPU</span>
                  </div>
                  <span className="font-medium truncate">
                    {console.processor}
                  </span>

                  <div className="flex items-center space-x-2">
                    <Gpu className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">GPU</span>
                  </div>
                  <span className="font-medium truncate">{console.gpu}</span>

                  <div className="flex items-center space-x-2">
                    <Memory className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">RAM</span>
                  </div>
                  <span className="font-medium">{console.ram}</span>

                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Storage</span>
                  </div>
                  <span className="font-medium">{console.storage}</span>
                </div>

                <div className="pt-2 flex items-center justify-between border-t">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Status</span>
                  </div>
                  <Badge variant={getStatusVariant(console.status)}>
                    {console.status ? "Available" : "Not Available"}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(console)}
                  className="hover:bg-primary/10"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="hover:bg-destructive/90"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you sure you want to delete?
                      </AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-red-700 hover:bg-red-800 text-white flex items-center gap-2">
                        <Button
                          className="bg-red-700 hover:bg-red-800 text-white flex items-center gap-2"
                          onClick={() => handleDelete(console.id)}
                        >
                          <Trash2 size={18} />
                          Confirm Delete
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}