"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Gamepad2,
  CalendarCheck,
  User,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ButtonDestructive } from "./log-out";
import { motion, AnimatePresence } from "framer-motion";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();

  return (
    <nav className={cn("flex flex-col space-y-6", className)} {...props}>
      {[ 
        { href: "/", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/transaction", icon: Receipt, label: "Transaction Report" },
        { href: "/gaming", icon: Gamepad2, label: "Manage Gaming Console" },
        { href: "/booking", icon: CalendarCheck, label: "Manage Booking" },
        { href: "/account", icon: User, label: "My Account" },
      ].map(({ href, icon: Icon, label }) => (
        <motion.div
          key={href}
          whileHover={{
            scale: 1.08,
            opacity: 0.9,  // Slight opacity fade to add smoothness
          }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 25, // Smoother damping for a more fluid feel
          }}
        >
          <Link
            href={href}
            className={cn(
              "group flex items-center space-x-2 rounded-md px-1 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              pathname === href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            {Icon && <Icon className="h-5 w-5 shrink-0" />}
            <motion.span
              className="hidden group-hover:inline-block"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              {label}
            </motion.span>
          </Link>
        </motion.div>
      ))}

      <AnimatePresence>
        <motion.button
          whileHover={{
            scale: 1.08,
            opacity: 0.9,  // Fade effect on hover for smoothness
          }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20, // Smooth damping for button hover effect
          }}
          onClick={() => setTheme?.(theme === "dark" ? "light" : "dark")}
          className={cn(
            "group flex items-center space-x-2 rounded-md px-1 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <div className="relative flex items-center justify-center w-5 h-5">
            <Sun
              className={cn(
                "absolute transition-transform duration-300",
                theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"
              )}
            />
            <Moon
              className={cn(
                "absolute transition-transform duration-300",
                theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"
              )}
            />
          </div>
          <motion.span
            className="hidden group-hover:inline-block"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
          >
            Toggle Theme
          </motion.span>
        </motion.button>
      </AnimatePresence>

      <ButtonDestructive />
    </nav>
  );
}
