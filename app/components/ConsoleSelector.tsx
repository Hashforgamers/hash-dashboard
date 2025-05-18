import React, { useEffect, useState } from 'react';
import { Monitor, Tv, Gamepad, Headset } from 'lucide-react';
import { motion } from 'framer-motion';
import { jwtDecode } from 'jwt-decode';
import { ConsoleType } from './types';
import { BOOKING_URL } from '@/src/config/env';

interface ConsoleSelectorProps {
  onSelectConsole: (console: ConsoleType) => void;
}

const ConsoleSelector: React.FC<ConsoleSelectorProps> = ({ onSelectConsole }) => {
  const [availableConsoles, setAvailableConsoles] = useState<ConsoleType[]>([]);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const consoleTypes: ConsoleType[] = [
    {
      type: "pc",
      icon: Monitor,
      color: "grey",
      iconColor: "#7c3aed",
      description: "Gaming PCs and Workstations",
      name: "PC",
      id: null,
    },
    {
      type: "ps5",
      icon: Tv,
      color: "grey",
      iconColor: "#2563eb",
      description: "PlayStation 5 Gaming Consoles",
      name: "PS5",
      id: null,
    },
    {
      type: "xbox",
      icon: Gamepad,
      color: "grey",
      iconColor: "#059669",
      description: "Xbox Series Gaming Consoles",
      name: "Xbox",
      id: null,
    },
    {
      type: "vr",
      icon: Headset,
      color: "grey",
      iconColor: "#ea580c",
      description: "Virtual Reality Systems",
      name: "VR",
      id: null,
    },
  ];

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    if (token) {
      try {
        const decoded = jwtDecode<{ sub: { id: number } }>(token);
        setVendorId(decoded.sub.id);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (vendorId === null) {
      setIsLoading(false);
      return;
    }

    const fetchAvailableConsoles = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${BOOKING_URL}/api/getAllConsole/vendor/${vendorId}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        const available = consoleTypes.map((console) => {
          const matchedConsole = data.games.find(
            (game: any) => game.console_name.toLowerCase() === console.type.toLowerCase()
          );
          
          if (matchedConsole) {
            return { ...console, id: matchedConsole.id };
          }
          return console;
        }).filter((console) => console.id !== null);

        setAvailableConsoles(available);
      } catch (error) {
        console.error("Error fetching consoles:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableConsoles();
  }, [vendorId]);

  return (
    <div className="p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Select Console Type
      </h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : availableConsoles.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No available consoles found.</p>
          {!vendorId && (
            <p className="text-sm text-red-500">Please log in to view available consoles.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {availableConsoles.map((console) => (
            <motion.div
              key={console.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
              onClick={() => onSelectConsole(console)}
              className="cursor-pointer"
            >
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl shadow-md hover:shadow-lg transition-all p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                    <console.icon className="w-8 h-8" style={{ color: console.iconColor }} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{console.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{console.description}</p>
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
