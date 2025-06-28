"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  List,
  Monitor,
  Gamepad,
  Tv,
  Headset,
  ArrowLeft,
} from "lucide-react";
import { AddConsoleForm } from "./add-console-form";
import { ConsoleList } from "./console-list";
import { EditConsoleForm } from "./edit-console-form";
import { motion, AnimatePresence } from "framer-motion";
import { jwtDecode } from "jwt-decode";

// Define the available actions (Add and List)
const actions = [
  {
    type: "add",
    icon: PlusCircle,
    label: "Add New Console",
    description: "Register a new gaming console in the system",
    color: "bg-emerald-100 dark:bg-emerald-950",
    iconColor: "#059669",
  },
  {
    type: "list",
    icon: List,
    label: "List Consoles",
    description: "View and manage existing consoles",
    color: "bg-blue-100 dark:bg-blue-950",
    iconColor: "#2563eb",
  },
];

// Define the available console types (PC, PS5, Xbox, VR)
const consoleTypes = [
  {
    type: "pc",
    name: "PC",
    icon: Monitor,
    color: "bg-purple-100 dark:bg-purple-950",
    iconColor: "#7c3aed",
    description: "Gaming PCs and Workstations",
  },
  {
    type: "ps5",
    name:"PS5",
    icon: Tv,
    color: "bg-blue-100 dark:bg-blue-950",
    iconColor: "#2563eb",
    description: "PlayStation 5 ",
  },
  {
    type: "xbox",
    name: "Xbox",
    icon: Gamepad,
    color: "bg-green-100 dark:bg-green-950",
    iconColor: "#059669",
    description: "Xbox Series Consoles",
  },
  {
    type: "vr",
    name: "VR",
    icon: Headset,
    color: "bg-orange-100 dark:bg-orange-950",
    iconColor: "#ea580c",
    description: "Virtual Reality Systems",
  },
];

export function ManageGamingConsole() {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedConsoleType, setSelectedConsoleType] = useState<string | null>(
    null
  );
  const [editingConsole, setEditingConsole] = useState<any | null>(null);

  const handleActionClick = (actionType: string) => {
    setSelectedAction(actionType);
    setSelectedConsoleType(null);
  };

  const handleConsoleTypeClick = (consoleType: string) => {
    setSelectedConsoleType(consoleType);
   
  };

  const handleEditConsole = (console: any) => {
    setEditingConsole(console);
  };

  const handleCloseEdit = () => {
    setEditingConsole(null);
  };

  const handleBack = () => {
    if (selectedConsoleType) {
      setSelectedConsoleType(null);
    } else {
      setSelectedAction(null);
    }
  };


  const renderContent = () => {
    if (selectedAction === "add") {
      if (selectedConsoleType) {
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AddConsoleForm consoleType={selectedConsoleType} />
          </motion.div>
        );
      }
      
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {consoleTypes.map((console) => (
            <motion.div
              key={console.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${console.color}`}
                onClick={() => handleConsoleTypeClick(console.type)}
              >
                <CardHeader>
                  <console.icon
                    className="w-8 h-8 mb-2"
                    style={{ color: console.iconColor }}
                  />
                  <CardTitle>{console.name}</CardTitle>
                  <CardDescription>{console.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      );
    }
    if (selectedAction === "list") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <ConsoleList onEdit={handleEditConsole} />
        </motion.div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {actions.map((action) => (
          <motion.div
            key={action.type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={`cursor-pointer transition-all hover:shadow-lg ${
                action.color
              } ${selectedAction === action.type ? "ring-2 ring-primary" : ""}`}
              onClick={() => handleActionClick(action.type)}
            >
              <CardHeader>
                {selectedAction === null && (
                  <action.icon
                    className="w-8 h-8 mb-2"
                    style={{ color: action.iconColor }}
                  />
                )}
                <CardTitle>{action.label}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div
        className="inline-flex items-center mb-10"
        style={{ position: "relative", height: "auto" }}
      >
        <motion.div
          className="flex items-center justify-center p-1 -ml-4"
          style={{ position: "absolute", left: "-56px" }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1.0, scale: 1.0 }}
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.3 }}
        >
          {(selectedAction === "add" || selectedAction === "list") && (
            <button
              type="button"
              onClick={handleBack}
              className=" text-center w-24 rounded-2xl  relative text-lime-100 text-sm   group"
            >
              <div className="bg-lime-400 rounded-xl h- w-1/4 grid place-items-center absolute left-0 top-0 group-hover:w-full z-10 duration-500">
                <svg
                  width="25px"
                  height="25px"
                  viewBox="0 0 1024 1024"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="#000000"
                    d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"
                  ></path>
                  <path
                    fill="#000000"
                    d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
                  ></path>
                </svg>
              </div>
              <p className="translate-x-4 width-24 text-lime-400">Go Back</p>
            </button>
          )}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>

      {editingConsole && (
        <EditConsoleForm console={editingConsole} onClose={handleCloseEdit} />
      )}
    </div>
  );
}
