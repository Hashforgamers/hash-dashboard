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
                    className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/25 bg-slate-900/70"
                    style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
                  >
                    <console.icon
                      className="h-6 w-6 md:h-7 md:w-7"
                      style={{ color: console.iconColor }}
                    />
                  </div>
                  <CardTitle className="dash-title !text-lg">{console.name}</CardTitle>
                  <CardDescription className="dash-subtitle mt-1 !text-slate-300">{console.description}</CardDescription>
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
                    className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/25 bg-slate-900/70"
                    style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
                  >
                    <action.icon
                      className="h-6 w-6 md:h-7 md:w-7"
                      style={{ color: action.iconColor }}
                    />
                  </div>
                )}
                <CardTitle className="dash-title !text-lg">{action.label}</CardTitle>
                <CardDescription className="dash-subtitle mt-1 !text-slate-300">{action.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full text-foreground">
      {/* Container with proper constraints */}
      <div className="w-full px-2 py-3 sm:px-3 sm:py-4 md:px-4 md:py-5">
        <div className="gaming-panel mb-4 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <h1 className="premium-heading !text-xl sm:!text-2xl md:!text-3xl">Gaming Console Control</h1>
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
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-4 py-2 font-medium text-cyan-200 transition-all duration-200 hover:bg-cyan-500/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </motion.button>
          </div>
        )}

        {/* Content Area */}
        <div className="gaming-panel rounded-xl p-3 sm:p-4 md:p-5">
          <AnimatePresence mode="wait">
            <div className="w-full">
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
