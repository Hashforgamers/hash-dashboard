"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Gamepad2,
  CalendarCheck,
  Users,
  DollarSign,
  Moon,
  Sun,
  UtensilsCrossed,
  Store,
  Ticket,
  ShoppingBag,
  Laptop,
  Trophy,
  KeyRound,
  Shield,
  Settings,
  Wallet,
  Star,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ButtonDestructive } from "./log-out";
import { useAccess } from "@/app/context/AccessContext";
import { Permission } from "@/lib/rbac";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  onItemClick?: () => void;
  isNavPinned?: boolean;
}

interface NavItem {
  href: string;
  icon: any;
  label: string;
  permission: Permission;
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", permission: "dashboard.view" },
  { href: "/gaming", icon: Laptop, label: "Manage Gaming Console", permission: "gaming.manage" },
  { href: "/booking", icon: CalendarCheck, label: "Manage Booking", permission: "booking.manage" },
  { href: "/transaction", icon: Receipt, label: "Transaction Report", permission: "transactions.view" },
  { href: "/manage-extraservice", icon: UtensilsCrossed, label: "Extra Services", permission: "extras.manage" },
  { href: "/know-your-gamers", icon: Users, label: "Know Your Gamers", permission: "gamers.view" },
  { href: "/console-pricing", icon: DollarSign, label: "Console Pricing", permission: "pricing.manage" },
  { href: "/gamers-credit", icon: Wallet, label: "Gamers Credit", permission: "pricing.manage" },
  { href: "/pass", icon: Ticket, label: "Manage Passes", permission: "passes.manage" },
  { href: "/store", icon: ShoppingBag, label: "Store", permission: "store.manage" },
  { href: "/games", icon: Gamepad2, label: "Games", permission: "games.manage" },
  { href: "/tournaments", icon: Trophy, label: "Tournaments", permission: "tournaments.manage" },
  { href: "/reviews", icon: Star, label: "Reviews", permission: "reviews.manage" },
  { href: "/select-cafe", icon: Store, label: "Select Cafe", permission: "cafe.switch" },
];

export function MainNav({ className, onItemClick, isNavPinned = false, ...props }: MainNavProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { can, setActiveByPin, activeStaff } = useAccess();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState("");
  const responsiveItemPaddingClass = isNavPinned ? "md:px-3 xl:px-3" : "md:px-3 xl:px-2 xl:group-hover:px-3";
  const responsiveLabelClass = isNavPinned ? "whitespace-nowrap md:block xl:block" : "whitespace-nowrap md:block xl:hidden xl:group-hover:block";

  const handleSwitchUser = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast.error("PIN must be 4 digits");
      return;
    }
    const result = await setActiveByPin(pin);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setPinDialogOpen(false);
    setPin("");
  };

  const canShowItem = (permission: Permission) => {
    const onSelectCafeRoute = pathname === "/select-cafe" || pathname?.startsWith("/select-cafe/");
    if (!activeStaff) return true;
    if (permission === "cafe.switch") return true;
    if (onSelectCafeRoute) return true;
    return can(permission);
  };

  return (
    <>
      <nav
        className={cn(
          "dashboard-nav flex h-full min-h-0 flex-col overflow-hidden transition-all duration-300 ease-in-out",
          className
        )}
        {...props}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col space-y-[clamp(0.08rem,0.25vh,0.2rem)]">
            {navItems
              .filter((item) => canShowItem(item.permission))
              .map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => onItemClick?.()}
                  className={cn(
                    "dashboard-nav-item group/nav flex min-h-[32px] items-center gap-2 rounded-lg border px-2.5 py-[clamp(0.2rem,0.55vh,0.38rem)] text-sm font-medium leading-tight transition-all duration-200",
                    responsiveItemPaddingClass,
                    pathname === href ? "gaming-nav-active text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      pathname === href ? "dashboard-nav-icon-active" : "text-muted-foreground group-hover/nav:text-foreground"
                    )}
                  />
                  <span className={responsiveLabelClass}>{label}</span>
                </Link>
              ))}
          </div>
        </div>

        <div className="dashboard-nav-divider shrink-0 space-y-[clamp(0.06rem,0.2vh,0.14rem)] border-t pt-2">
          {can("staff.manage") && (
            <Link
              href="/employee-access"
              onClick={() => onItemClick?.()}
              className={cn(
                "dashboard-nav-item group/nav flex min-h-[30px] items-center gap-2 rounded-lg border px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-sm font-medium leading-tight transition-all duration-200",
                responsiveItemPaddingClass,
                pathname === "/employee-access" ? "gaming-nav-active text-foreground" : "text-muted-foreground"
              )}
            >
              <Shield
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  pathname === "/employee-access" ? "dashboard-nav-icon-active" : "text-muted-foreground group-hover/nav:text-foreground"
                )}
              />
              <span className={responsiveLabelClass}>Team Access</span>
            </Link>
          )}

          <button
            onClick={() => {
              setPinDialogOpen(true);
              onItemClick?.();
            }}
            className={cn(
              "dashboard-nav-item group/nav flex w-full min-h-[30px] items-center gap-2 rounded-lg border px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-sm font-medium leading-tight transition-all duration-200",
              responsiveItemPaddingClass,
              "text-muted-foreground"
            )}
          >
            <KeyRound className="h-[18px] w-[18px] shrink-0 transition-colors text-muted-foreground group-hover/nav:text-foreground" />
            <span className={responsiveLabelClass}>Switch User PIN</span>
          </button>

          {can("account.manage") && (
            <Link
              href="/account"
              onClick={() => onItemClick?.()}
              className={cn(
                "dashboard-nav-item group/nav flex min-h-[30px] items-center gap-2 rounded-lg border px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-sm font-medium leading-tight transition-all duration-200",
                responsiveItemPaddingClass,
                pathname === "/account" ? "gaming-nav-active text-foreground" : "text-muted-foreground"
              )}
            >
              <Settings
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  pathname === "/account" ? "dashboard-nav-icon-active" : "text-muted-foreground group-hover/nav:text-foreground"
                )}
              />
              <span className={responsiveLabelClass}>Settings</span>
            </Link>
          )}

          <button
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              onItemClick?.();
            }}
            className={cn(
              "dashboard-nav-item group/nav flex min-h-[30px] w-full items-center gap-2 rounded-lg border px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-sm font-medium leading-tight transition-all duration-200",
              responsiveItemPaddingClass,
              "text-muted-foreground"
            )}
          >
            <div className="relative flex h-5 w-5 items-center justify-center">
              <Sun className={cn("absolute transition-transform duration-300", theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100")} />
              <Moon className={cn("absolute transition-transform duration-300", theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0")} />
            </div>
            <span className={responsiveLabelClass}>Toggle Theme</span>
          </button>

          <ButtonDestructive isNavPinned={isNavPinned} />
        </div>
      </nav>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Switch Active User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter employee PIN to switch dashboard access level.</p>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              maxLength={4}
              placeholder="Enter 4-digit PIN"
              onKeyDown={(e) => e.key === "Enter" && void handleSwitchUser()}
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setPinDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSwitchUser()} disabled={pin.length !== 4}>
                Switch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
