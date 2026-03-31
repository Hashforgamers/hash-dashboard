"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import { ConsoleType } from "./types";
import { BOOKING_URL } from "@/src/config/env";
import {
  normalizeConsoleSlug,
  resolveConsoleColor,
  resolveConsoleIcon,
  type ConsoleCatalogItem,
} from "./console-catalog";

interface ConsoleSelectorProps {
  onSelectConsole: (console: ConsoleType) => void;
}

interface VendorConsoleGameRow {
  id?: number;
  console_name?: string;
  console_slug?: string;
  console_display_name?: string;
  console_price?: number;
  icon?: string;
}

const ConsoleSelector: React.FC<ConsoleSelectorProps> = ({ onSelectConsole }) => {
  const [availableConsoles, setAvailableConsoles] = useState<ConsoleType[]>([]);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) return;
    try {
      const decoded = jwtDecode<{ sub?: { id?: number } | number }>(token);
      if (typeof decoded?.sub === "number") {
        setVendorId(decoded.sub);
        return;
      }
      const parsed = Number(decoded?.sub?.id || 0);
      setVendorId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    } catch {
      setVendorId(null);
    }
  }, []);

  useEffect(() => {
    if (!vendorId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const fetchConsoleData = async () => {
      try {
        setIsLoading(true);
        const [gamesRes, catalogRes] = await Promise.all([
          fetch(`${BOOKING_URL}/api/getAllConsole/vendor/${vendorId}`),
          fetch(`${BOOKING_URL}/api/console-types/vendor/${vendorId}`),
        ]);

        const gamesJson = gamesRes.ok ? await gamesRes.json() : {};
        const catalogJson = catalogRes.ok ? await catalogRes.json() : {};
        const games: VendorConsoleGameRow[] = Array.isArray(gamesJson?.games) ? gamesJson.games : [];
        const catalog: ConsoleCatalogItem[] = Array.isArray(catalogJson?.console_types)
          ? catalogJson.console_types
          : Array.isArray(gamesJson?.catalog)
            ? gamesJson.catalog
            : [];

        const catalogBySlug = new Map<string, ConsoleCatalogItem>();
        for (const item of catalog) {
          const slug = normalizeConsoleSlug(item?.slug || "");
          if (!slug || item?.is_active === false) continue;
          catalogBySlug.set(slug, item);
        }

        const mapped: ConsoleType[] = games
          .map((game) => {
            const slug = normalizeConsoleSlug(
              game.console_slug || game.console_name || game.console_display_name || ""
            );
            if (!slug) return null;
            const caps = catalogBySlug.get(slug);
            const displayName = String(
              game.console_display_name || caps?.display_name || game.console_name || slug
            ).trim();

            return {
              type: slug,
              icon: resolveConsoleIcon(game.icon || caps?.icon, slug),
              color: "grey",
              iconColor: resolveConsoleColor(slug),
              description: `${displayName} systems`,
              name: displayName,
              id: Number(game.id || 0) || null,
              price: typeof game.console_price === "number" ? game.console_price : null,
            };
          })
          .filter((item): item is ConsoleType => Boolean(item));

        if (!mounted) return;
        setAvailableConsoles(mapped);
      } catch {
        if (!mounted) return;
        setAvailableConsoles([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchConsoleData();
    return () => {
      mounted = false;
    };
  }, [vendorId]);

  const hasConsoles = useMemo(() => Array.isArray(availableConsoles) && availableConsoles.length > 0, [availableConsoles]);

  return (
    <div className="p-6 md:p-8">
      <h2 className="mb-6 text-center text-2xl font-bold">Select Console Type</h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-emerald-500"></div>
        </div>
      ) : !hasConsoles ? (
        <div className="py-10 text-center">
          <p className="mb-2 text-gray-600 dark:text-gray-400">No available console types found for this cafe.</p>
          {!vendorId && <p className="text-sm text-red-500">Please sign in again to continue.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {availableConsoles.map((consoleType) => (
            <motion.div
              key={`${consoleType.type}-${consoleType.id ?? "x"}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
              onClick={() => onSelectConsole(consoleType)}
              className="cursor-pointer"
            >
              <div className="rounded-xl border border-gray-200 p-6 shadow-md transition-all hover:border-emerald-500 hover:shadow-lg dark:border-gray-700">
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                    <consoleType.icon className="h-8 w-8" style={{ color: consoleType.iconColor }} />
                  </div>
                  <div>
                    <h3 className="mb-1 text-xl font-semibold text-gray-800 dark:text-white">{consoleType.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{consoleType.description}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConsoleSelector;
