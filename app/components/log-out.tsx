import { LogOut } from "lucide-react";

export function ButtonDestructive() {
  return (
    <button
      className="group flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground text-red-500 md:pl-[8px]"
      onClick={() => {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("tokenExpiration");
        window.location.href = "/login"; // Redirect after logout
      }}
    >
      <LogOut className="h-5 w-5 shrink-0 mb-12" />
      <span className="block md:hidden md:group-hover:block whitespace-nowrap mb-12 font-medium">Logout</span>
    </button>
  );
}
