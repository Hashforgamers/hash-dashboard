import { LogOut } from "lucide-react";

export function ButtonDestructive() {
  return (
    <button
      className="group/nav flex min-h-[34px] items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-[clamp(0.28rem,0.75vh,0.52rem)] text-[13px] font-medium leading-tight text-red-400 transition-all duration-200 hover:border-border/70 hover:bg-muted/50 hover:text-red-300 md:px-3 xl:px-2 xl:group-hover/nav:px-3"
      onClick={() => {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("tokenExpiration");
        window.location.href = "/login"; // Redirect after logout
      }}
    >
      <LogOut className="h-[18px] w-[18px] shrink-0" />
      <span className="whitespace-nowrap md:block xl:hidden xl:group-hover:block">Logout</span>
    </button>
  );
}
