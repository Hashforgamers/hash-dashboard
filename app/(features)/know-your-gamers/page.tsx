import { KnowYourGamers } from "../../components/know-your-gamers";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { Sparkles } from "lucide-react";

export default function ManageKnowYourGamers() {
  return (
    <DashboardLayout>
      <div className="flex-1 space-y-3 sm:space-y-4">
        <div className="gaming-panel rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <h1 className="premium-heading !text-xl sm:!text-2xl md:!text-3xl">
              Gamer Intelligence Hub
            </h1>
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </div>
          <p className="premium-subtle mt-1">
            Track player behavior, value, and retention insights in one command view.
          </p>
        </div>

        <div className="gaming-panel rounded-xl p-2 sm:p-3 md:p-4">
          <KnowYourGamers />
        </div>
      </div>
    </DashboardLayout>
  );
}
