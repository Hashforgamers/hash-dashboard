"use client";

import { Logout03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface ButtonDestructiveProps {
  isNavPinned?: boolean;
}

export function ButtonDestructive({ isNavPinned = false }: ButtonDestructiveProps) {
  const responsiveItemPaddingClass = isNavPinned ? "md:px-3 xl:px-3" : "md:px-3 xl:px-2 xl:px-1 xl:group-hover/nav:px-3";
  const responsiveItemAlignClass = isNavPinned ? "justify-start" : "justify-start xl:justify-center xl:group-hover/nav:justify-start";
  const responsiveLabelClass = isNavPinned ? "whitespace-nowrap md:block xl:block" : "whitespace-nowrap md:block xl:hidden xl:group-hover:block";
  return (
    <button
      className={`dashboard-nav-item dashboard-nav-danger group/nav flex min-h-[46px] items-center gap-2 rounded-xl border px-2.5 py-[clamp(0.26rem,0.6vh,0.42rem)] text-sm font-medium leading-tight transition-all duration-200 ${responsiveItemPaddingClass} ${responsiveItemAlignClass}`}
      onClick={() => {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("tokenExpiration");
        localStorage.removeItem("active_staff_session_v1");
        localStorage.removeItem("rbac_access_token_v1");
        window.location.href = "/login"; // Redirect after logout
      }}
    >
      <span className="dashboard-nav-item-icon">
        <HugeiconsIcon icon={Logout03Icon} size={18} strokeWidth={1.7} className="shrink-0" />
      </span>
      <span className={`dashboard-nav-label ${responsiveLabelClass}`}>Logout</span>
    </button>
  );
}
