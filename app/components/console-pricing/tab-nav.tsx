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
    <div className="gaming-panel dashboard-module-panel mb-2 flex w-full shrink-0 items-center gap-2 rounded-xl p-2">
      <button
        onClick={() => setActiveTab("default")}
        className={`${tabButtonBaseClass} ${activeTab === "default" ? activeTabButtonClass : inactiveTabButtonClass}`}
      >
        <IndianRupee className="icon-md" />
        Default Pricing
      </button>
      <button
        onClick={() => setActiveTab("offers")}
        className={`${tabButtonBaseClass} ${activeTab === "offers" ? activeTabButtonClass : inactiveTabButtonClass}`}
      >
        <Sparkles className="icon-md" />
        Promotional Offers
      </button>
      <button
        onClick={() => setActiveTab("controllers")}
        className={`${tabButtonBaseClass} ${activeTab === "controllers" ? activeTabButtonClass : inactiveTabButtonClass}`}
      >
        <Gamepad className="icon-md" />
        Controller Pricing
      </button>
      <button
        onClick={() => setActiveTab("squad")}
        className={`${tabButtonBaseClass} ${activeTab === "squad" ? activeTabButtonClass : inactiveTabButtonClass}`}
      >
        <Users className="icon-md" />
        Squad Pricing
      </button>
    </div>
  );
}
