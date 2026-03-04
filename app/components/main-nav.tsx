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
  Trophy,
  KeyRound,
  Shield,
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
  { href: "/pass", icon: Ticket, label: "Manage Passes", permission: "passes.manage" },
  { href: "/store", icon: ShoppingBag, label: "Store", permission: "store.manage" },
  { href: "/games", icon: Gamepad2, label: "Games", permission: "games.manage" },
  { href: "/tournaments", icon: Trophy, label: "Tournaments", permission: "tournaments.manage" },
  { href: "/select-cafe", icon: Store, label: "Select Cafe", permission: "cafe.switch" },
];

export function MainNav({ className, onItemClick, ...props }: MainNavProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { can, activeStaff, setActiveByPin, clearAccessSession, setSelectedCafe } = useAccess();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState("");

  const clearStorageExceptVendor = () => {
    const keysToKeep = ["vendor_login_email", "vendors"];
    Object.keys(localStorage).forEach((key) => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    setSelectedCafe(null);
    clearAccessSession();
  };

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

  return (
    <>
      <nav
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden transition-all duration-300 ease-in-out",
          className
        )}
        {...props}
      >
        <div className="mb-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Active User</p>
          <p className="truncate text-sm font-semibold text-foreground">{activeStaff?.name || "Owner"}</p>
          <p className="text-[11px] capitalize text-emerald-400">{activeStaff?.role || "owner"}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col space-y-[clamp(0.08rem,0.25vh,0.2rem)]">
            {navItems
              .filter((item) => can(item.permission))
              .map(({ href, icon: Icon, label }) => (
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
                    pathname === href ? "gaming-nav-active text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      pathname === href ? "text-emerald-400" : "text-muted-foreground group-hover/nav:text-foreground"
                    )}
                  />
                  <span className="whitespace-nowrap md:block xl:hidden xl:group-hover:block">{label}</span>
                </Link>
              ))}
          </div>
        </div>

        <div className="shrink-0 space-y-[clamp(0.06rem,0.2vh,0.14rem)] border-t border-border/60 pt-2">
          {can("staff.manage") && (
            <Link
              href="/employee-access"
              onClick={onItemClick}
              className={cn(
                "group/nav flex min-h-[30px] items-center gap-2 rounded-lg border border-transparent px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-[13px] font-medium leading-tight transition-all duration-200",
                "hover:border-border/70 hover:bg-muted/50 hover:text-foreground",
                "md:px-3 xl:px-2 xl:group-hover:px-3",
                pathname === "/employee-access" ? "gaming-nav-active text-foreground" : "text-muted-foreground"
              )}
            >
              <Shield
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  pathname === "/employee-access" ? "text-emerald-400" : "text-muted-foreground group-hover/nav:text-foreground"
                )}
              />
              <span className="whitespace-nowrap md:block xl:hidden xl:group-hover:block">Team Access</span>
            </Link>
          )}

          <button
            onClick={() => {
              setPinDialogOpen(true);
              onItemClick?.();
            }}
            className={cn(
              "group/nav flex w-full min-h-[30px] items-center gap-2 rounded-lg border border-transparent px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-[13px] font-medium leading-tight transition-all duration-200",
              "hover:border-border/70 hover:bg-muted/50 hover:text-foreground",
              "md:px-3 xl:px-2 xl:group-hover:px-3 text-muted-foreground"
            )}
          >
            <KeyRound className="h-[18px] w-[18px] shrink-0 transition-colors text-muted-foreground group-hover/nav:text-foreground" />
            <span className="whitespace-nowrap md:block xl:hidden xl:group-hover:block">Switch User PIN</span>
          </button>

          {can("account.manage") && (
            <Link
              href="/account"
              onClick={onItemClick}
              className={cn(
                "group/nav flex min-h-[30px] items-center gap-2 rounded-lg border border-transparent px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-[13px] font-medium leading-tight transition-all duration-200",
                "hover:border-border/70 hover:bg-muted/50 hover:text-foreground",
                "md:px-3 xl:px-2 xl:group-hover:px-3",
                pathname === "/account" ? "gaming-nav-active text-foreground" : "text-muted-foreground"
              )}
            >
              <User
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  pathname === "/account" ? "text-emerald-400" : "text-muted-foreground group-hover/nav:text-foreground"
                )}
              />
              <span className="whitespace-nowrap md:block xl:hidden xl:group-hover:block">My Account</span>
            </Link>
          )}

          <button
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              onItemClick?.();
            }}
            className={cn(
              "group/nav flex min-h-[30px] w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-[13px] font-medium leading-tight transition-all duration-200",
              "hover:border-border/70 hover:bg-muted/50 hover:text-foreground",
              "md:px-3 xl:px-2 xl:group-hover:px-3",
              "text-muted-foreground"
            )}
          >
            <div className="relative flex h-5 w-5 items-center justify-center">
              <Sun className={cn("absolute transition-transform duration-300", theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100")} />
              <Moon className={cn("absolute transition-transform duration-300", theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0")} />
            </div>
            <span className="whitespace-nowrap md:block xl:hidden xl:group-hover:block">Toggle Theme</span>
          </button>

          <ButtonDestructive />
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
