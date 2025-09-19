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
      type: "PC",
      icon: Monitor,
      color: "grey",
      iconColor: "#7c3aed", 
      description: "Gaming PCs and Workstations",
      name: "PC Gaming",
      id: null,
      price: null,
    },
    {
      type: "PS5",
      icon: Tv,
      color: "grey",
      iconColor: "#2563eb",
      description: "PlayStation 5 Consoles",
      name: "PlayStation 5",
      id: null,
      price: null,
    },
    {
      type: "Xbox",
      icon: Gamepad,
      color: "grey",
      iconColor: "#059669",
      description: "Xbox Series Gaming Consoles", 
      name: "Xbox Series",
      id: null,
      price: null,
    },
    {
      type: "VR",
      icon: Headset,
      color: "grey",
      iconColor: "#ea580c",
      description: "Virtual Reality Systems",
      name: "VR Gaming",
      id: null,
      price: null,
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
        console.log('🎮 Fetching consoles from API for vendor:', vendorId);
        
        const response = await fetch(`${BOOKING_URL}/api/getAllConsole/vendor/${vendorId}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🎮 API Response:', data);
        console.log('🎮 Available games:', data.games?.map((g: any) => ({ 
          id: g.id, 
          name: g.console_name, 
          type: g.type || 'no-type'
        })));
        
        // ✅ ENHANCED: More robust matching with debugging
        const available = consoleTypes.map((consoleTemplate) => {
          console.log(`\n🔍 Looking for matches for: ${consoleTemplate.type}`);
          
          // Try to find matching console from API
          const matchedConsole = data.games?.find((game: any) => {
            const apiConsoleName = (game.console_name || '').toLowerCase().trim();
            const templateType = consoleTemplate.type.toLowerCase().trim();
            
            console.log(`  🔎 Checking: "${apiConsoleName}" vs "${templateType}"`);
            
            // Multiple matching strategies
            const strategies = [
              // Exact match
              () => apiConsoleName === templateType,
              
              // Contains match
              () => apiConsoleName.includes(templateType) || templateType.includes(apiConsoleName),
              
              // Special PC matches
              () => templateType === 'pc' && (
                apiConsoleName.includes('pc') || 
                apiConsoleName.includes('gaming') || 
                apiConsoleName.includes('computer') ||
                apiConsoleName.includes('desktop')
              ),
              
              // Special PS5 matches  
              () => templateType === 'ps5' && (
                apiConsoleName.includes('ps5') ||
                apiConsoleName.includes('playstation') ||
                apiConsoleName.includes('play station') ||
                apiConsoleName.includes('sony')
              ),
              
              // Special Xbox matches
              () => templateType === 'xbox' && (
                apiConsoleName.includes('xbox') ||
                apiConsoleName.includes('x box') ||
                apiConsoleName.includes('microsoft') ||
                apiConsoleName.includes('series')
              ),
              
              // Special VR matches
              () => templateType === 'vr' && (
                apiConsoleName.includes('vr') ||
                apiConsoleName.includes('virtual') ||
                apiConsoleName.includes('reality') ||
                apiConsoleName.includes('oculus') ||
                apiConsoleName.includes('meta') ||
                apiConsoleName.includes('headset')
              )
            ];
            
            for (let i = 0; i < strategies.length; i++) {
              if (strategies[i]()) {
                console.log(`    ✅ Match found using strategy ${i + 1}`);
                return true;
              }
            }
            
            console.log(`    ❌ No match found`);
            return false;
          });
          
          if (matchedConsole) {
            console.log(`✅ MATCHED ${consoleTemplate.type}:`, {
              id: matchedConsole.id,
              name: matchedConsole.console_name,
              price: matchedConsole.console_price
            });
            
            return { 
              ...consoleTemplate,
              id: matchedConsole.id,
              price: matchedConsole.console_price,
              // ⚠️ CRITICAL: Always use our predefined type, never the API type
              type: consoleTemplate.type,
              name: consoleTemplate.name
            };
          } else {
            console.log(`❌ NO MATCH for ${consoleTemplate.type}`);
            return null;
          }
        }).filter(Boolean); // Remove null entries

        console.log('\n🎮 Final available consoles:', available.map(c => ({
          type: c?.type,
          id: c?.id,
          name: c?.name,
          price: c?.price
        })));
        
        setAvailableConsoles(available as ConsoleType[]);
      } catch (error) {
        console.error("❌ Error fetching consoles:", error);
        setAvailableConsoles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableConsoles();
  }, [vendorId]);

  // ✅ FIXED: Handle console selection with enhanced logging
  const handleConsoleSelect = (selectedConsole: ConsoleType) => {
    console.log('\n🎯 CONSOLE SELECTED:');
    console.log('  Type:', selectedConsole.type);
    console.log('  ID:', selectedConsole.id);
    console.log('  Name:', selectedConsole.name);
    console.log('  Price:', selectedConsole.price);
    console.log('  Full object:', selectedConsole);
    
    // Verify the console type is correct
    if (!selectedConsole.type || selectedConsole.type.includes('Console--')) {
      console.error('⚠️ WARNING: Console type looks incorrect:', selectedConsole.type);
    }
    
    onSelectConsole(selectedConsole);
  };

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
          
          {/* Debug info for empty state */}
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left max-w-md mx-auto">
            <p className="text-sm font-medium mb-2">Debug Info:</p>
            <p className="text-xs">Vendor ID: {vendorId}</p>
            <p className="text-xs">Check browser console for API details</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {availableConsoles.map((consoleType) => (
            <motion.div
              key={consoleType.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
              onClick={() => handleConsoleSelect(consoleType)}
              className="cursor-pointer"
            >
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl shadow-md hover:shadow-lg transition-all p-6 hover:border-emerald-500">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                    <consoleType.icon className="w-8 h-8" style={{ color: consoleType.iconColor }} />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                      {consoleType.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                      {consoleType.description}
                    </p>
                  
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
