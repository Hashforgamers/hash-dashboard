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
import { PlusCircle, List, Monitor, Gamepad, Tv, Headset, ArrowLeft } from 'lucide-react';
import { AddConsoleForm } from "./add-console-form";
import { ConsoleList } from "./console-list";
import { EditConsoleForm } from "./edit-console-form";
import { motion, AnimatePresence } from "framer-motion";
import { jwtDecode } from "jwt-decode";

const actions = [
  {
    type: "add",
    icon: PlusCircle,
    label: "Add New Console",
    description: "Register a new gaming console in the system",
    iconColor: "#059669",
  },
  {
    type: "list",
    icon: List,
    label: "List Consoles",
    description: "View and manage existing consoles",
    iconColor: "#2563eb",
  },
];

const consoleTypes = [
  {
    type: "pc",
    name: "PC",
    icon: Monitor,
    iconColor: "#7c3aed",
    description: "Gaming PCs and Workstations",
  },
  {
    type: "ps5",
    name: "PS5",
    icon: Tv,
    iconColor: "#2563eb",
    description: "PlayStation 5",
  },
  {
    type: "xbox",
    name: "Xbox",
    icon: Gamepad,
    iconColor: "#059669",
    description: "Xbox Series Consoles",
  },
  {
    type: "vr",
    name: "VR",
    icon: Headset,
    iconColor: "#ea580c",
    description: "Virtual Reality Systems",
  },
];

export function ManageGamingConsole() {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedConsoleType, setSelectedConsoleType] = useState<string | null>(null);
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
            className="w-full"
          >
            <AddConsoleForm consoleType={selectedConsoleType} />
          </motion.div>
        );
      }

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {consoleTypes.map((console) => (
            <motion.div
              key={console.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className="cursor-pointer transition-all hover:shadow-lg bg-card border-border rounded-lg hover:bg-accent/50"
                onClick={() => handleConsoleTypeClick(console.type)}
              >
                <CardHeader className="p-4 md:p-6">
                  <console.icon
                    className="w-6 h-6 md:w-8 md:h-8 mb-2"
                    style={{ color: console.iconColor }}
                  />
                  <CardTitle className="text-foreground text-lg md:text-xl">{console.name}</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">{console.description}</CardDescription>
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
          className="w-full"
        >
          <ConsoleList onEdit={handleEditConsole} />
        </motion.div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {actions.map((action) => (
          <motion.div
            key={action.type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={`cursor-pointer transition-all hover:shadow-lg bg-card border-border rounded-lg hover:bg-accent/50 ${
                selectedAction === action.type ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleActionClick(action.type)}
            >
              <CardHeader className="p-4 md:p-6">
                {selectedAction === null && (
                  <action.icon
                    className="w-6 h-6 md:w-8 md:h-8 mb-2"
                    style={{ color: action.iconColor }}
                  />
                )}
                <CardTitle className="text-foreground text-lg md:text-xl">{action.label}</CardTitle>
                <CardDescription className="text-muted-foreground text-sm">{action.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full bg-background text-foreground">
      {/* Container with proper constraints */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Back Button Section */}
        {(selectedAction === "add" || selectedAction === "list") && (
          <div className="mb-6">
            <motion.button
              type="button"
              onClick={handleBack}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-lime-400 text-lime-900 rounded-lg hover:bg-lime-500 transition-all duration-200 font-medium"
            >
              <svg
                width="20px"
                height="20px"
                viewBox="0 0 1024 1024"
                xmlns="http://www.w3.org/2000/svg"
                className="rotate-0"
              >
                <path
                  fill="currentColor"
                  d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"
                />
                <path
                  fill="currentColor"
                  d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
                />
              </svg>
              Go Back
            </motion.button>
          </div>
        )}

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <div className="w-full">
            {renderContent()}
          </div>
        </AnimatePresence>

        {/* Edit Modal */}
        {editingConsole && (
          <EditConsoleForm console={editingConsole} onClose={handleCloseEdit} />
        )}
      </div>
    </div>
  );
}
