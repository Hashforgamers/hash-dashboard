"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  AwardIcon,
  Calendar02Icon,
  DashboardSquare01Icon,
  DollarCircleIcon,
  GamepadDirectionalIcon,
  Key02Icon,
  LaptopIcon,
  Moon02Icon,
  ReceiptTextIcon,
  Settings01Icon,
  Shield01Icon,
  ShoppingBag01Icon,
  SpoonAndForkIcon,
  StarIcon,
  Store01Icon,
  Sun03Icon,
  Ticket01Icon,
  Users,
  WalletCardsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
  { href: "/dashboard", icon: DashboardSquare01Icon, label: "Dashboard", permission: "dashboard.view" },
  { href: "/gaming", icon: LaptopIcon, label: "Manage Gaming Console", permission: "gaming.manage" },
  { href: "/booking", icon: Calendar02Icon, label: "Manage Booking", permission: "booking.manage" },
  { href: "/transaction", icon: ReceiptTextIcon, label: "Transaction Report", permission: "transactions.view" },
  { href: "/manage-extraservice", icon: SpoonAndForkIcon, label: "Extra Services", permission: "extras.manage" },
  { href: "/know-your-gamers", icon: Users, label: "Know Your Gamers", permission: "gamers.view" },
  { href: "/console-pricing", icon: DollarCircleIcon, label: "Console Pricing", permission: "pricing.manage" },
  { href: "/gamers-credit", icon: WalletCardsIcon, label: "Gamers Credit", permission: "pricing.manage" },
  { href: "/pass", icon: Ticket01Icon, label: "Manage Passes", permission: "passes.manage" },
  { href: "/store", icon: ShoppingBag01Icon, label: "Store", permission: "store.manage" },
  { href: "/games", icon: GamepadDirectionalIcon, label: "Games", permission: "games.manage" },
  { href: "/tournaments", icon: AwardIcon, label: "Tournaments", permission: "tournaments.manage" },
  { href: "/reviews", icon: StarIcon, label: "Reviews", permission: "reviews.manage" },
  { href: "/select-cafe", icon: Store01Icon, label: "Select Cafe", permission: "cafe.switch" },
];

export function MainNav({ className, onItemClick, isNavPinned = false, ...props }: MainNavProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { can, setActiveByPin, clearAccessSession, setSelectedCafe } = useAccess();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState("");
  const responsiveItemPaddingClass = isNavPinned ? "md:px-3 xl:px-3" : "md:px-3 xl:px-2 xl:px-1 xl:group-hover:px-3";
  const responsiveItemAlignClass = isNavPinned ? "justify-start" : "justify-start xl:justify-center xl:group-hover:justify-start";
  const responsiveLabelClass = isNavPinned ? "whitespace-nowrap md:block xl:block" : "whitespace-nowrap md:block xl:hidden xl:group-hover:block";
  const responsiveSectionLabelClass = isNavPinned ? "block" : "hidden xl:group-hover:block";

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
          "dashboard-nav flex h-full min-h-0 flex-col overflow-hidden transition-all duration-300 ease-in-out",
          className
        )}
        {...props}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          <div className={cn("dashboard-nav-section-label pb-2", responsiveSectionLabelClass)}>
            Navigation
          </div>
          <div className="flex flex-col space-y-[clamp(0.28rem,0.7vh,0.45rem)]">
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
                    "dashboard-nav-item group/nav flex min-h-[46px] items-center gap-2 rounded-xl border px-2.5 py-[clamp(0.26rem,0.6vh,0.42rem)] text-sm font-medium leading-tight transition-all duration-200",
                    responsiveItemPaddingClass,
                    responsiveItemAlignClass,
                    pathname === href ? "dashboard-nav-item-active text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="dashboard-nav-item-icon">
                    <HugeiconsIcon
                      icon={Icon}
                      size={18}
                      strokeWidth={1.7}
                      className={cn(
                        "shrink-0 transition-colors",
                        pathname === href ? "dashboard-nav-icon-active" : "text-muted-foreground group-hover/nav:text-foreground"
                      )}
                    />
                  </span>
                  <span className={cn("dashboard-nav-label", responsiveLabelClass)}>{label}</span>
                </Link>
              ))}
          </div>
        </div>

        <div className="dashboard-nav-divider shrink-0 space-y-[clamp(0.22rem,0.55vh,0.36rem)] border-t pt-3">
          <div className={cn("dashboard-nav-section-label pb-1", responsiveSectionLabelClass)}>
            Tools
          </div>
          {can("staff.manage") && (
            <Link
              href="/employee-access"
              onClick={onItemClick}
              className={cn(
                "dashboard-nav-item group/nav flex min-h-[46px] items-center gap-2 rounded-xl border px-2.5 py-[clamp(0.22rem,0.52vh,0.36rem)] text-sm font-medium leading-tight transition-all duration-200",
                responsiveItemPaddingClass,
                responsiveItemAlignClass,
                pathname === "/employee-access" ? "dashboard-nav-item-active text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="dashboard-nav-item-icon">
                <HugeiconsIcon
                  icon={Shield01Icon}
                  size={18}
                  strokeWidth={1.7}
                  className={cn(
                    "shrink-0 transition-colors",
                    pathname === "/employee-access" ? "dashboard-nav-icon-active" : "text-muted-foreground group-hover/nav:text-foreground"
                  )}
                />
              </span>
              <span className={cn("dashboard-nav-label", responsiveLabelClass)}>Team Access</span>
            </Link>
          )}

          <button
            onClick={() => {
              setPinDialogOpen(true);
              onItemClick?.();
            }}
            className={cn(
              "dashboard-nav-item group/nav flex w-full min-h-[46px] items-center gap-2 rounded-xl border px-2.5 py-[clamp(0.22rem,0.52vh,0.36rem)] text-sm font-medium leading-tight transition-all duration-200",
              responsiveItemPaddingClass,
              responsiveItemAlignClass,
              "text-muted-foreground"
            )}
          >
            <span className="dashboard-nav-item-icon">
              <HugeiconsIcon
                icon={Key02Icon}
                size={18}
                strokeWidth={1.7}
                className="shrink-0 transition-colors text-muted-foreground group-hover/nav:text-foreground"
              />
            </span>
            <span className={cn("dashboard-nav-label", responsiveLabelClass)}>Switch User PIN</span>
          </button>

          {can("account.manage") && (
            <Link
              href="/account"
              onClick={onItemClick}
              className={cn(
                "dashboard-nav-item group/nav flex min-h-[46px] items-center gap-2 rounded-xl border px-2.5 py-[clamp(0.22rem,0.52vh,0.36rem)] text-sm font-medium leading-tight transition-all duration-200",
                responsiveItemPaddingClass,
                responsiveItemAlignClass,
                pathname === "/account" ? "dashboard-nav-item-active text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="dashboard-nav-item-icon">
                <HugeiconsIcon
                  icon={Settings01Icon}
                  size={18}
                  strokeWidth={1.7}
                  className={cn(
                    "shrink-0 transition-colors",
                    pathname === "/account" ? "dashboard-nav-icon-active" : "text-muted-foreground group-hover/nav:text-foreground"
                  )}
                />
              </span>
              <span className={cn("dashboard-nav-label", responsiveLabelClass)}>Settings</span>
            </Link>
          )}

          <button
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              onItemClick?.();
            }}
            className={cn(
              "dashboard-nav-item group/nav flex min-h-[46px] w-full items-center gap-2 rounded-xl border px-2.5 py-[clamp(0.22rem,0.52vh,0.36rem)] text-sm font-medium leading-tight transition-all duration-200",
              responsiveItemPaddingClass,
              responsiveItemAlignClass,
              "text-muted-foreground"
            )}
          >
            <span className="dashboard-nav-item-icon">
              <div className="relative flex h-5 w-5 items-center justify-center">
                <HugeiconsIcon
                  icon={Sun03Icon}
                  size={18}
                  strokeWidth={1.7}
                  className={cn("absolute transition-transform duration-300", theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100")}
                />
                <HugeiconsIcon
                  icon={Moon02Icon}
                  size={18}
                  strokeWidth={1.7}
                  className={cn("absolute transition-transform duration-300", theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0")}
                />
              </div>
            </span>
            <span className={cn("dashboard-nav-label", responsiveLabelClass)}>Toggle Theme</span>
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
