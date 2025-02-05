import { LogOut } from "lucide-react";

export function ButtonDestructive() {
  return (
    <div className="absolute bottom-0 w-max "> 
      <button className="group flex items-center space-x-2 rounded-md px-1 py-2 text-base font-medium text-red-500 transition-all hover:scale-105 hover:bg-accent">
        <LogOut className="h-5 w-5 shrink-0" />
        <span className="hidden group-hover:inline-block">Logout</span>
      </button>
    </div>
  );
}
