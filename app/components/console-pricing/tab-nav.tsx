import { Gamepad, IndianRupee, Sparkles, Users } from "lucide-react";
import { PricingTab } from "./types";

interface TabNavProps {
  activeTab: PricingTab;
  setActiveTab: (tab: PricingTab) => void;
  tabButtonBaseClass: string;
  activeTabButtonClass: string;
  inactiveTabButtonClass: string;
}

export function ConsolePricingTabNav({
  activeTab,
  setActiveTab,
  tabButtonBaseClass,
  activeTabButtonClass,
  inactiveTabButtonClass,
}: TabNavProps) {
  return (
    <div className="flex w-full shrink-0 items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
      <button
        aria-pressed={activeTab === "default"}
        onClick={() => setActiveTab("default")}
        className={`${tabButtonBaseClass} ${activeTab === "default" ? activeTabButtonClass : inactiveTabButtonClass}`}
      >
        <IndianRupee className="icon-md" />
        Slot rates
      </button>
      <button
        aria-pressed={activeTab === "offers"}
        onClick={() => setActiveTab("offers")}
        className={`${tabButtonBaseClass} ${activeTab === "offers" ? activeTabButtonClass : inactiveTabButtonClass}`}
      >
        <Sparkles className="icon-md" />
        Offers
      </button>
      <button
        aria-pressed={activeTab === "controllers"}
        onClick={() => setActiveTab("controllers")}
        className={`${tabButtonBaseClass} ${activeTab === "controllers" ? activeTabButtonClass : inactiveTabButtonClass}`}
      >
        <Gamepad className="icon-md" />
        Controllers
      </button>
      <button
        aria-pressed={activeTab === "squad"}
        onClick={() => setActiveTab("squad")}
        className={`${tabButtonBaseClass} ${activeTab === "squad" ? activeTabButtonClass : inactiveTabButtonClass}`}
      >
        <Users className="icon-md" />
        Squad
      </button>
    </div>
  );
}
