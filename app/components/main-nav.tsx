"use client";
import { PrivatePin } from "./private-pin";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Gamepad2,
  Users,
  DollarSign,
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
  section: string;
}

const navItems: NavItem[] = [
  {href:"/dashboard",icon:LayoutDashboard,label:"Dashboard",permission:"dashboard.view",section:"Overview"},
  {href:"/gaming",icon:Laptop,label:"Gaming Stations",permission:"gaming.manage",section:"Café Operations"},
  {href:"/dashboard?tab=booking",icon:Gamepad2,label:"Bookings & Sessions",permission:"booking.manage",section:"Café Operations"},
  {href:"/manage-extraservice",icon:UtensilsCrossed,label:"Food & Extras",permission:"extras.manage",section:"Café Operations"},
  {href:"/transaction",icon:Receipt,label:"Transactions",permission:"transactions.view",section:"Café Operations"},
  {href:"/know-your-gamers",icon:Users,label:"Gamers",permission:"gamers.view",section:"Gamers"},
  {href:"/gamers-credit",icon:Wallet,label:"Gamer Credit",permission:"credit.manage",section:"Gamers"},
  {href:"/pass",icon:Ticket,label:"Passes & Memberships",permission:"passes.manage",section:"Gamers"},
  {href:"/reviews",icon:Star,label:"Reviews",permission:"reviews.manage",section:"Gamers"},
  {href:"/console-pricing",icon:DollarSign,label:"Pricing & Offers",permission:"pricing.manage",section:"Management"},
  {href:"/store",icon:ShoppingBag,label:"Store",permission:"store.manage",section:"Management"},
  {href:"/games",icon:Gamepad2,label:"Game Library",permission:"games.manage",section:"Management"},
  {href:"/tournaments",icon:Trophy,label:"Tournaments",permission:"tournaments.manage",section:"Management"},
];

export function MainNav({ className, onItemClick, isNavPinned = false, ...props }: MainNavProps) {
  const pathname = usePathname();
  const activeHref=pathname;
  const { can, setActiveByPin, activeStaff, selectedCafeId } = useAccess();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [cafeName,setCafeName]=useState("Select café");
  useEffect(()=>{try{const cafes=JSON.parse(localStorage.getItem("vendors")||"[]");const cafe=cafes.find((c:any)=>String(c.id)===String(selectedCafeId));setCafeName(cafe?.cafe_name|| (selectedCafeId?`Café #${selectedCafeId}`:"Select café"))}catch{setCafeName("Switch café")}},[selectedCafeId]);
  const responsiveItemPaddingClass = isNavPinned ? "md:px-3 xl:px-3" : "md:px-3 xl:px-2 xl:group-hover:px-3";
  const responsiveLabelClass = isNavPinned ? "whitespace-nowrap md:block xl:block" : "whitespace-nowrap md:block xl:hidden xl:group-hover:block";
  const collapsedAlignClass = isNavPinned
    ? "justify-start xl:justify-start"
    : "justify-start xl:justify-center xl:group-hover:justify-start";

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
        <Link href="/select-cafe" title={`Switch café: ${cafeName}`} onClick={()=>onItemClick?.()} className={cn("mb-2 flex shrink-0 items-center gap-2 rounded-lg border p-2",collapsedAlignClass)}><Store className="h-5 w-5 shrink-0"/><span className={responsiveLabelClass}><span className="block text-[10px] text-muted-foreground">Café Management</span><span className="block max-w-44 truncate text-sm font-medium">{cafeName} ▾</span></span></Link>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col space-y-[clamp(0.08rem,0.25vh,0.2rem)]">
            {navItems
              .filter((item) => canShowItem(item.permission))
              .map(({ href, icon: Icon, label, section },index,items) => (
                <Fragment key={href}>{(index===0||items[index-1].section!==section)&&<p className={cn("px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",responsiveLabelClass)}>{section}</p>}
                <Link
                  key={href}
                  href={href}
                  title={label}
                  onClick={() => onItemClick?.()}
                  className={cn(
                    "dashboard-nav-item group/nav flex min-h-[32px] items-center gap-2 rounded-lg border px-2.5 py-[clamp(0.2rem,0.55vh,0.38rem)] text-sm font-medium leading-tight transition-all duration-200",
                    responsiveItemPaddingClass,
                    collapsedAlignClass,
                    activeHref === href ? "gaming-nav-active text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      activeHref === href ? "dashboard-nav-icon-active" : "text-muted-foreground group-hover/nav:text-foreground"
                    )}
                  />
                  <span className={responsiveLabelClass}>{label}</span>
                </Link></Fragment>
              ))}
          </div>
        </div>

        <div className="dashboard-nav-divider shrink-0 space-y-[clamp(0.06rem,0.2vh,0.14rem)] border-t pt-2">
          <p className={cn("px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",responsiveLabelClass)}>Administration</p>
          {can("staff.manage") && (
            <Link
              href="/employee-access"
              onClick={() => onItemClick?.()}
              className={cn(
                "dashboard-nav-item group/nav flex min-h-[30px] items-center gap-2 rounded-lg border px-2.5 py-[clamp(0.14rem,0.42vh,0.28rem)] text-sm font-medium leading-tight transition-all duration-200",
                responsiveItemPaddingClass,
                collapsedAlignClass,
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
              collapsedAlignClass,
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
                collapsedAlignClass,
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

          <ButtonDestructive isNavPinned={isNavPinned} />
        </div>
      </nav>

      <Dialog open={pinDialogOpen} onOpenChange={open=>{setPinDialogOpen(open);setPin("");}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Switch Active User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter owner or employee PIN to switch dashboard access level.</p>
            <PrivatePin value={pin} onChange={setPin} onEnter={()=>void handleSwitchUser()}/>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => {setPinDialogOpen(false);setPin("");}}>
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
