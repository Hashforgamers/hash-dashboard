"use client";

import { LogOut } from "lucide-react";

interface ButtonDestructiveProps {
  isNavPinned?: boolean;
}

export function ButtonDestructive({ isNavPinned = false }: ButtonDestructiveProps) {
  const responsiveItemPaddingClass = isNavPinned ? "md:px-3 xl:px-3" : "md:px-3 xl:px-2 xl:group-hover/nav:px-3";
  const responsiveLabelClass = isNavPinned ? "whitespace-nowrap md:block xl:block" : "whitespace-nowrap md:block xl:hidden xl:group-hover:block";
  const collapsedAlignClass = isNavPinned
    ? "justify-start xl:justify-start"
    : "justify-start xl:justify-center xl:group-hover/nav:justify-start";
  return (
    <button
      className={`dashboard-nav-item dashboard-nav-danger group/nav flex min-h-[32px] items-center gap-2 rounded-lg border px-2.5 py-[clamp(0.2rem,0.55vh,0.38rem)] text-sm font-medium leading-tight transition-all duration-200 ${responsiveItemPaddingClass} ${collapsedAlignClass}`}
      onClick={() => {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("tokenExpiration");
        localStorage.removeItem("active_staff_session_v1");
        localStorage.removeItem("rbac_access_token_v1");
        window.location.href = "/login"; // Redirect after logout
      }}
    >
      <LogOut className="h-[18px] w-[18px] shrink-0" />
      <span className={responsiveLabelClass}>Logout</span>
    </button>
  );
}
