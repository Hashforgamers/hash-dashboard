"use client";

import { Bell, MessageSquare, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export function TopBar() {
  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-b dark:border-gray-700 shadow-sm"
    >
      <div className=" mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.h1 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-xl font-semibold  dark:text-gray-100"
          >
            Welcome, John
          </motion.h1>
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-white/50 border border-gray-300 rounded-full pl-10 pr-4 py-1.5 text-sm text-gray-800 dark:bg-gray-700/50 dark:text-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-64 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 ease-in-out"
              />
            </div>

            <select className="bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-1.5 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>

            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="relative cursor-pointer"
            >
              <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center">3</span>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="relative cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center">2</span>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
