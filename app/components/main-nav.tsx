"use client";

import { Fragment } from "react";
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
  Ticket,
  ShoppingBag,
  Laptop,
  Trophy,
  Shield,
  Settings,
  Wallet,
  Star,
  QrCode,
} from "lucide-react";
import { useAccess } from "@/app/context/AccessContext";
import { Permission } from "@/lib/rbac";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  onItemClick?: () => void;
  /** Icon rail: labels move into tooltips and group labels become separators. */
  collapsed?: boolean;
}

interface NavItem {
  href: string;
  icon: any;
  label: string;
  permission: Permission;
  section: string;
}

export const navItems: NavItem[] = [
  {href:"/dashboard",icon:LayoutDashboard,label:"Dashboard",permission:"dashboard.view",section:"Overview"},
  {href:"/gaming",icon:Laptop,label:"Gaming Stations",permission:"gaming.manage",section:"Café Operations"},
  {href:"/dashboard?tab=booking",icon:Gamepad2,label:"Bookings & Sessions",permission:"booking.manage",section:"Café Operations"},
  {href:"/booking-link",icon:QrCode,label:"Booking Link & QR",permission:"booking.manage",section:"Café Operations"},
  {href:"/manage-extraservice",icon:UtensilsCrossed,label:"Food & Extras",permission:"extras.manage",section:"Café Operations"},
  {href:"/transaction",icon:Receipt,label:"Transactions",permission:"transactions.view",section:"Café Operations"},
  {href:"/know-your-gamers",icon:Users,label:"Gamers",permission:"gamers.view",section:"Gamers"},
  {href:"/gamers-credit",icon:Wallet,label:"Gamer Credit",permission:"credit.manage",section:"Gamers"},
  {href:"/pass",icon:Ticket,label:"Passes & Memberships",permission:"passes.manage",section:"Gamers"},
  {href:"/reviews",icon:Star,label:"Reviews",permission:"reviews.manage",section:"Gamers"},
  {href:"/console-pricing",icon:DollarSign,label:"Pricing & Offers",permission:"pricing.manage",section:"Management"},
  {href:"/store",icon:ShoppingBag,label:"Shop",permission:"store.manage",section:"Management"},
  {href:"/games",icon:Gamepad2,label:"Game Library",permission:"games.manage",section:"Management"},
  {href:"/tournaments",icon:Trophy,label:"Tournaments",permission:"tournaments.manage",section:"Management"},
];

function NavLink({ href, icon: Icon, label, active, collapsed, onClick }: { href: string; icon: any; label: string; active: boolean; collapsed: boolean; onClick?: () => void }) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      data-active={active || undefined}
      className={cn("shell-nav-item", collapsed && "shell-nav-item-collapsed")}
    >
      <Icon className="shell-nav-icon" aria-hidden="true" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>{label}</TooltipContent>
    </Tooltip>
  );
}

function SectionLabel({ label, collapsed, first }: { label: string; collapsed: boolean; first?: boolean }) {
  if (collapsed) return first ? null : <div role="separator" className="shell-nav-separator" />;
  return <p className="shell-nav-section">{label}</p>;
}

export function MainNav({ className, onItemClick, collapsed = false, ...props }: MainNavProps) {
  const pathname = usePathname();
  const activeHref = pathname;
  const { can, activeStaff } = useAccess();

  const canShowItem = (permission: Permission) => {
    const onSelectCafeRoute = pathname === "/select-cafe" || pathname?.startsWith("/select-cafe/");
    if (!activeStaff) return true;
    if (permission === "cafe.switch") return true;
    if (onSelectCafeRoute) return true;
    return can(permission);
  };

  const adminItems = [
    can("staff.manage") && { href: "/employee-access", icon: Shield, label: "Team Access" },
    can("account.manage") && { href: "/account", icon: Settings, label: "Settings" },
  ].filter(Boolean) as { href: string; icon: any; label: string }[];

  return (
    <nav
      aria-label="Main"
      className={cn("dashboard-nav flex min-h-0 flex-col", className)}
      {...props}
    >
      <div className="shell-nav-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {navItems
          .filter((item) => canShowItem(item.permission))
          .map(({ href, icon, label, section }, index, items) => (
            <Fragment key={href}>
              {(index === 0 || items[index - 1].section !== section) && (
                <SectionLabel label={section} collapsed={collapsed} first={index === 0} />
              )}
              <NavLink href={href} icon={icon} label={label} active={activeHref === href} collapsed={collapsed} onClick={onItemClick} />
            </Fragment>
          ))}
      </div>

      {adminItems.length > 0 && (
        <div className="shell-nav-footer shrink-0">
          <SectionLabel label="Administration" collapsed={collapsed} />
          {adminItems.map((item) => (
            <NavLink key={item.href} {...item} active={pathname === item.href} collapsed={collapsed} onClick={onItemClick} />
          ))}
        </div>
      )}
    </nav>
  );
}
