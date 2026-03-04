export type Permission =
  | "dashboard.view"
  | "gaming.manage"
  | "booking.manage"
  | "transactions.view"
  | "extras.manage"
  | "gamers.view"
  | "pricing.manage"
  | "passes.manage"
  | "store.manage"
  | "games.manage"
  | "tournaments.manage"
  | "account.manage"
  | "staff.manage"
  | "subscription.manage"
  | "cafe.switch";

export type StaffRole = "owner" | "manager" | "staff";

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: [
    "dashboard.view",
    "gaming.manage",
    "booking.manage",
    "transactions.view",
    "extras.manage",
    "gamers.view",
    "pricing.manage",
    "passes.manage",
    "store.manage",
    "games.manage",
    "tournaments.manage",
    "account.manage",
    "staff.manage",
    "subscription.manage",
    "cafe.switch",
  ],
  manager: [
    "dashboard.view",
    "gaming.manage",
    "booking.manage",
    "transactions.view",
    "extras.manage",
    "gamers.view",
    "pricing.manage",
    "passes.manage",
    "store.manage",
    "games.manage",
    "tournaments.manage",
    "cafe.switch",
  ],
  staff: [
    "dashboard.view",
    "booking.manage",
    "gaming.manage",
    "gamers.view",
    "store.manage",
    "games.manage",
  ],
};

export interface NavItemPermission {
  href: string;
  permission: Permission;
}

export const NAV_PERMISSION_MAP: NavItemPermission[] = [
  { href: "/dashboard", permission: "dashboard.view" },
  { href: "/gaming", permission: "gaming.manage" },
  { href: "/booking", permission: "booking.manage" },
  { href: "/transaction", permission: "transactions.view" },
  { href: "/manage-extraservice", permission: "extras.manage" },
  { href: "/know-your-gamers", permission: "gamers.view" },
  { href: "/console-pricing", permission: "pricing.manage" },
  { href: "/pass", permission: "passes.manage" },
  { href: "/store", permission: "store.manage" },
  { href: "/games", permission: "games.manage" },
  { href: "/tournaments", permission: "tournaments.manage" },
  { href: "/select-cafe", permission: "cafe.switch" },
  { href: "/account", permission: "account.manage" },
  { href: "/subscription", permission: "subscription.manage" },
  { href: "/employee-access", permission: "staff.manage" },
];

export function canAccessPath(pathname: string, permissions: Permission[]): boolean {
  const matched = NAV_PERMISSION_MAP.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!matched) {
    return true;
  }
  return permissions.includes(matched.permission);
}
