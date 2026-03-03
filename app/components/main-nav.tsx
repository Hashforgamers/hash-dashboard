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
  UtensilsCrossed,
  Store,
  Ticket,
  ShoppingBag,
  Laptop,
  Trophy
} from "lucide-react";
import { useTheme } from "next-themes";
import { ButtonDestructive } from "./log-out";

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  onItemClick?: () => void;
}

export function MainNav({
  className,
  onItemClick,
  ...props
}: MainNavProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();

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
        "flex h-full min-h-0 flex-col overflow-hidden transition-all duration-300 ease-in-out",
        className
      )}
      {...props}
    >
      {/* Main navigation items */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col space-y-[clamp(0.08rem,0.25vh,0.2rem)]">
          {[
            { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/gaming", icon: Laptop, label: "Manage Gaming Console" },
            { href: "/booking", icon: CalendarCheck, label: "Manage Booking" },
            { href: "/transaction", icon: Receipt, label: "Transaction Report" },
            { href: "/manage-extraservice", icon: UtensilsCrossed, label: "Extra Services" },
            { href: "/know-your-gamers", icon: Users, label: "Know Your Gamers" },
            { href: "/console-pricing", icon: DollarSign, label: "Console Pricing" },
            { href: "/pass", icon: Ticket, label: "Manage Passes" },
            { href: "/store", icon: ShoppingBag, label: "Store" },
            { href: "/games", icon: Gamepad2, label: "Games" },
            { href: "/tournaments", icon: Trophy, label: "Tournaments" },
            { href: "/select-cafe", icon: Store, label: "Select Cafe" },
          ].map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (href === "/select-cafe") {
                  clearStorageExceptVendor();
                }
                onItemClick?.();
              }}
              className={cn(
                "group/nav flex min-h-[32px] items-center gap-2 rounded-lg border border-transparent px-2.5 py-[clamp(0.2rem,0.55vh,0.38rem)] text-[13px] font-medium leading-tight transition-all duration-200",
                "hover:border-border/70 hover:bg-muted/50 hover:text-foreground",
                "md:px-3 xl:px-2 xl:group-hover:px-3",
                pathname === href
                  ? "gaming-nav-active text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", pathname === href ? "text-emerald-400" : "text-muted-foreground group-hover/nav:text-foreground")} />
              <span className="whitespace-nowrap md:block xl:hidden xl:group-hover:block">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Utility actions */}
      <div className="shrink-0 space-y-[clamp(0.06rem,0.2vh,0.14rem)] border-t border-border/60 pt-2">
        <Link
          href="/account"
          onClick={onItemClick}
          className={cn(
            "group/nav flex min-h-[30px] items-center gap-2 rounded-lg border border-transparent px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-[13px] font-medium leading-tight transition-all duration-200",
            "hover:border-border/70 hover:bg-muted/50 hover:text-foreground",
            "md:px-3 xl:px-2 xl:group-hover:px-3",
            pathname === "/account"
              ? "gaming-nav-active text-foreground"
              : "text-muted-foreground"
          )}
        >
          <User className={cn("h-[18px] w-[18px] shrink-0 transition-colors", pathname === "/account" ? "text-emerald-400" : "text-muted-foreground group-hover/nav:text-foreground")} />
          <span className="whitespace-nowrap md:block xl:hidden xl:group-hover:block">My Account</span>
        </Link>

        {/* Theme toggle */}
        <button
          onClick={() => {setTheme(theme === "dark" ? "light" : "dark"); onItemClick?.();}}
          className={cn(
            "group/nav flex min-h-[30px] items-center gap-2 rounded-lg border border-transparent px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-[13px] font-medium leading-tight transition-all duration-200",
            "hover:border-border/70 hover:bg-muted/50 hover:text-foreground",
            "md:px-3 xl:px-2 xl:group-hover:px-3",
            "text-muted-foreground"
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
          <span className="whitespace-nowrap md:block xl:hidden xl:group-hover:block">Toggle Theme</span>
        </button>

        <ButtonDestructive />
      </div>
    </nav>
  );
}
