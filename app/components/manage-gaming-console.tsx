"use client";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PlusCircle, List, Monitor, Gamepad, Tv, Headset, ArrowLeft, Sparkles } from 'lucide-react';
import { AddConsoleForm } from "./add-console-form";
import { ConsoleList } from "./console-list";
import { EditConsoleForm } from "./edit-console-form";
import { motion, AnimatePresence } from "framer-motion";

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
  const [listRefreshKey, setListRefreshKey] = useState(0);

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

  const handleCloseEdit = (didUpdate?: boolean) => {
    setEditingConsole(null);
    if (didUpdate) {
      setListRefreshKey((prev) => prev + 1);
    }
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
            className="h-full min-h-0 w-full overflow-y-auto pr-1"
          >
            <AddConsoleForm consoleType={selectedConsoleType} />
          </motion.div>
        );
      }

      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
          {consoleTypes.map((console) => (
            <motion.div
              key={console.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className="gaming-panel cursor-pointer rounded-xl border border-cyan-500/25 transition-all duration-200 hover:border-cyan-400/45 hover:shadow-[0_0_20px_rgba(6,182,212,0.12)]"
                onClick={() => handleConsoleTypeClick(console.type)}
              >
                <CardHeader className="p-4 md:p-6">
                  <div
                    className="feature-action-icon mb-3"
                    style={{ ["--feature-icon-color" as string]: console.iconColor }}
                  >
                    <console.icon className="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                  <CardTitle className="dash-title !text-lg">{console.name}</CardTitle>
                  <CardDescription className="dash-subtitle premium-subtle mt-1">{console.description}</CardDescription>
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
          className="h-full min-h-0 w-full"
        >
          <ConsoleList onEdit={handleEditConsole} refreshKey={listRefreshKey} />
        </motion.div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {actions.map((action) => (
          <motion.div
            key={action.type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={`gaming-panel cursor-pointer rounded-xl border border-cyan-500/25 transition-all duration-200 hover:border-cyan-400/45 hover:shadow-[0_0_20px_rgba(6,182,212,0.12)] ${
                selectedAction === action.type ? "ring-2 ring-cyan-400/50" : ""
              }`}
              onClick={() => handleActionClick(action.type)}
            >
              <CardHeader className="p-4 md:p-6">
                {selectedAction === null && (
                  <div
                    className="feature-action-icon mb-3"
                    style={{ ["--feature-icon-color" as string]: action.iconColor }}
                  >
                    <action.icon className="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                )}
                <CardTitle className="dash-title !text-lg">{action.label}</CardTitle>
                <CardDescription className="dash-subtitle premium-subtle mt-1">{action.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col text-foreground">
      {/* Container with proper constraints */}
      <div className="flex h-full min-h-0 w-full flex-col px-2 py-3 sm:px-3 sm:py-4 md:px-4 md:py-5">
        <div className="gaming-panel mb-4 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <h1 className="premium-heading">Gaming Console Control</h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="premium-subtle mt-1">
            Add, organize, and operate your cafe consoles with a unified control panel.
          </p>
        </div>

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
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-white px-4 py-2 font-medium text-slate-900 transition-all duration-200 hover:bg-slate-50 dark:border-cyan-400/35 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </motion.button>
          </div>
        )}

        {/* Content Area */}
        <div className="gaming-panel flex-1 min-h-0 overflow-y-auto rounded-xl p-3 sm:p-4 md:p-5">
          <AnimatePresence mode="wait">
            <div className="h-full min-h-0 w-full">
            {renderContent()}
            </div>
          </AnimatePresence>
        </div>

        {/* Edit Modal */}
        {editingConsole && (
          <EditConsoleForm console={editingConsole} onClose={handleCloseEdit} />
        )}
      </div>
    </div>
  );
}
