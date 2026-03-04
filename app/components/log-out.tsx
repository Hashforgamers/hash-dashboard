"use client";

import { LogOut } from "lucide-react";

interface ButtonDestructiveProps {
  isNavPinned?: boolean;
}

export function ButtonDestructive({ isNavPinned = false }: ButtonDestructiveProps) {
  const responsiveItemPaddingClass = isNavPinned ? "md:px-3 xl:px-3" : "md:px-3 xl:px-2 xl:group-hover/nav:px-3";
  const responsiveLabelClass = isNavPinned ? "whitespace-nowrap md:block xl:block" : "whitespace-nowrap md:block xl:hidden xl:group-hover:block";
  return (
    <button
      className={`group/nav flex min-h-[32px] items-center gap-2 rounded-lg border border-transparent px-2.5 py-[clamp(0.2rem,0.55vh,0.38rem)] text-[13px] font-medium leading-tight text-red-400 transition-all duration-200 hover:border-border/70 hover:bg-muted/50 hover:text-red-300 ${responsiveItemPaddingClass}`}
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
