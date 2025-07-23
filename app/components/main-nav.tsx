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
  Users,
  DollarSign,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { ButtonDestructive } from "./log-out";

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  onItemClick?: () => void; // ADDED: Callback to close mobile menu
}

export function MainNav({
  className,
  onItemClick,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const clearStorageExceptVendor = () => {
    const keysToKeep = ["vendor_login_email", "vendors"];
    Object.keys(localStorage).forEach((key) => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
  };

  return (
    <nav
      className={cn(
        "flex flex-col space-y-2 transition-all duration-300 ease-in-out",
        className
      )}
      {...props}
    >
      {[
        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/transaction", icon: Receipt, label: "Transaction Report" },
        { href: "/gaming", icon: Gamepad2, label: "Manage Gaming Console" },
        { href: "/booking", icon: CalendarCheck, label: "Manage Booking" },
        { href: "/know-your-gamers", icon: Users, label: "Know Your Gamers" },
        { href: "/console-pricing", icon: DollarSign, label: "Console Pricing" },
        { href: "/account", icon: User, label: "My Account" },
      ].map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          onClick={onItemClick}
          className={cn(
            "group flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
            pathname === href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="block md:hidden md:group-hover:block whitespace-nowrap">{label}</span>
        </Link>
      ))}

      {/* Select Cafe link */}
      <Link
        href="/select-cafe"
        onClick={() => {
          clearStorageExceptVendor();
          onItemClick?.();
        }}
        className={cn(
          "group flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
          pathname === "/select-cafe"
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground"
        )}
      >
        <LayoutDashboard className="h-5 w-5 shrink-0" />
        <span className="block md:hidden md:group-hover:block whitespace-nowrap">Select Cafe</span>
      </Link>

      {/* Theme toggle */}
      <button
        onClick={() => {setTheme(theme === "dark" ? "light" : "dark"); onItemClick?.();}}
        className={cn(
          "group flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
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
        <span className="block md:hidden md:group-hover:block whitespace-nowrap">Toggle Theme</span>
      </button>

      <ButtonDestructive />
    </nav>
  );
}
