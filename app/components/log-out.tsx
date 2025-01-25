import { LogOut } from "lucide-react";

export function ButtonDestructive() {
  return (
    <div className="absolute bottom-0 left-0 pl-5 pb-5">
      <button className="flex items-center space-x-2 rounded-md text-red-500 px-4 py-2 transition-transform duration-200 ease-out hover:scale-105">
        <LogOut className="w-4 h-4 transition-transform duration-200 ease-out hover:scale-110" />
        <span className="font-medium">Logout</span>
      </button>
    </div>
  );
}
