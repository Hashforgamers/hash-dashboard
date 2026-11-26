"use client";

import { Bell, MessageSquare, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export function TopBar() {
  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-b border-border shadow-sm"
    >
      <div className=" mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.h1 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-xl font-semibold text-foreground"
          >
            Welcome, John
          </motion.h1>
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Search data-search-icon="" aria-hidden="true" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input data-search-input=""
                type="text"
                placeholder="Search..."
                className="border rounded-full pl-10 pr-4 py-1.5 text-sm bg-muted/50 text-foreground border-border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-64 placeholder-muted-foreground transition-all duration-200 ease-in-out"
              />
            </div>

            <select className="bg-muted rounded-full px-4 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>

            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="relative cursor-pointer"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center">3</span>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="relative cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center">2</span>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
