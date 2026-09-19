"use client";
import { useEffect, useState } from "react";
import { PlusCircle, List, Monitor, ArrowLeft, Tv, Gamepad, Headset } from 'lucide-react';
import { AddConsoleForm } from "./add-console-form";
import { ConsoleList } from "./console-list";
import { EditConsoleForm } from "./edit-console-form";
import { motion, AnimatePresence } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import { DASHBOARD_URL } from "@/src/config/env";
import {
  normalizeConsoleSlug,
  resolveConsoleColor,
  resolveConsoleIcon,
  type ConsoleCatalogItem,
} from "./console-catalog";

const DEFAULT_CONSOLE_TYPES = [
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
  const [selectedAction, setSelectedAction] = useState<string | null>("list");
  const [selectedConsoleType, setSelectedConsoleType] = useState<string | null>(null);
  const [consoleTypes, setConsoleTypes] = useState(DEFAULT_CONSOLE_TYPES);
  const [editingConsole, setEditingConsole] = useState<any | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) return;
    let vendorId: number | null = null;
    try {
      const decoded = jwtDecode<{ sub?: { id?: number } | number }>(token);
      if (typeof decoded?.sub === "number") vendorId = decoded.sub;
      else vendorId = Number(decoded?.sub?.id || 0) || null;
    } catch {
      vendorId = null;
    }
    if (!vendorId) return;

    let isMounted = true;
    const loadConsoleTypes = async () => {
      try {
        const response = await fetch(`${DASHBOARD_URL}/api/console-types?vendor_id=${vendorId}`);
        const data = await response.json();
        const items = Array.isArray(data?.console_types) ? (data.console_types as ConsoleCatalogItem[]) : [];
        if (!isMounted || items.length === 0) return;
        const dynamic = items
          .filter((item) => item?.is_active !== false)
          .map((item) => {
            const slug = normalizeConsoleSlug(item.slug);
            const displayName = String(item.display_name || slug).trim();
            return {
              type: slug,
              name: displayName,
              icon: resolveConsoleIcon(item.icon, slug),
              iconColor: resolveConsoleColor(slug),
              description: `${displayName} systems`,
            };
          });
        if (dynamic.length > 0) {
          setConsoleTypes(dynamic);
        }
      } catch {
        // Keep defaults when catalog API is unavailable.
      }
    };
    loadConsoleTypes();
    return () => {
      isMounted = false;
    };
  }, []);

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
        <div className="console-type-picker">
          {consoleTypes.map((console) => (
            <button
              key={console.type}
              type="button"
              className="console-type-option"
              onClick={() => handleConsoleTypeClick(console.type)}
            >
              <console.icon className="h-5 w-5 text-muted-foreground" />
              <span>{console.name}</span>
            </button>
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

    return null;
  };

  return (
    <div className="console-manager flex h-full min-h-0 w-full flex-col text-foreground">
      <div className="console-manager-header">
        <h1 className="premium-heading">Gaming Consoles</h1>
        <div className="tab-container" aria-label="Console views">
          <button type="button" aria-pressed={selectedAction === "list"}
            className={selectedAction === "list" ? "tab-active" : "tab-inactive"}
            onClick={() => handleActionClick("list")}>
            <List className="h-4 w-4" /> List
          </button>
          <button type="button" aria-pressed={selectedAction === "add"}
            className={selectedAction === "add" ? "tab-active" : "tab-inactive"}
            onClick={() => handleActionClick("add")}>
            <PlusCircle className="h-4 w-4" /> Add Console
          </button>
        </div>
      </div>
      {selectedConsoleType && (
        <div>
          <button type="button" onClick={handleBack} className="ui-action-secondary inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Console types
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </div>

        {/* Edit Modal */}
        {editingConsole && (
          <EditConsoleForm console={editingConsole} onClose={handleCloseEdit} />
        )}
    </div>
  );
}
