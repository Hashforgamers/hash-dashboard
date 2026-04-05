import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AvailableGame, OfferFormState, PricingOffer } from "./types";

interface OfferFormModalProps {
  showOfferForm: boolean;
  editingOffer: PricingOffer | null;
  offerForm: OfferFormState;
  setOfferForm: (next: OfferFormState) => void;
  availableGames: AvailableGame[];
  setShowOfferForm: (value: boolean) => void;
  onResetOfferForm: () => void;
  onSubmit: () => void;
  isCreatingOffer: boolean;
  isUpdatingOffer: boolean;
  inputSurfaceClass: string;
  selectSurfaceClass: string;
  primaryButtonClass: string;
  secondaryButtonClass: string;
}

export function OfferFormModal({
  showOfferForm,
  editingOffer,
  offerForm,
  setOfferForm,
  availableGames,
  setShowOfferForm,
  onResetOfferForm,
  onSubmit,
  isCreatingOffer,
  isUpdatingOffer,
  inputSurfaceClass,
  selectSurfaceClass,
  primaryButtonClass,
  secondaryButtonClass,
}: OfferFormModalProps) {
  if (!showOfferForm) return null;

  return (
    <div className="fixed inset-0 z-[30050] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="ui-dialog-surface w-full max-w-md overflow-hidden rounded-xl shadow-2xl"
      >
            <div className="flex items-center justify-between border-b border-cyan-500/20 px-5 py-4">
              <h2 className="card-title">{editingOffer ? "Edit Promotion" : "Create New Promotion"}</h2>
              <button
                onClick={() => {
                  setShowOfferForm(false);
                  onResetOfferForm();
                }}
                className="slot-booking-modal-close inline-flex items-center justify-center rounded-lg p-2"
              >
                <X className="icon-md" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="table-header-text">Offer Title *</label>
                <Input
                  placeholder="e.g. Weekend Bash 2024"
                  value={offerForm.offer_name}
                  onChange={(e) => setOfferForm({ ...offerForm, offer_name: e.target.value })}
                  className={inputSurfaceClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="table-header-text">Console Type *</label>
                <select
                  className={selectSurfaceClass}
                  value={offerForm.available_game_id}
                  onChange={(e) => setOfferForm({ ...offerForm, available_game_id: e.target.value })}
                  disabled={Boolean(editingOffer)}
                >
                  <option value="">Choose console type...</option>
                  {availableGames.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.game_name} (Base ₹{g.single_slot_price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="table-header-text">Promo Rate (₹) *</label>
                <Input
                  type="number"
                  placeholder="Enter discounted price"
                  value={offerForm.offered_price}
                  onChange={(e) => setOfferForm({ ...offerForm, offered_price: e.target.value })}
                  className={`${inputSurfaceClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="table-header-text">Start Date</label>
                  <Input
                    type="date"
                    value={offerForm.start_date}
                    onChange={(e) => setOfferForm({ ...offerForm, start_date: e.target.value })}
                    className={inputSurfaceClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="table-header-text">Start Time</label>
                  <Input
                    type="time"
                    value={offerForm.start_time}
                    onChange={(e) => setOfferForm({ ...offerForm, start_time: e.target.value })}
                    className={inputSurfaceClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="table-header-text">End Date</label>
                  <Input
                    type="date"
                    value={offerForm.end_date}
                    onChange={(e) => setOfferForm({ ...offerForm, end_date: e.target.value })}
                    className={inputSurfaceClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="table-header-text">End Time</label>
                  <Input
                    type="time"
                    value={offerForm.end_time}
                    onChange={(e) => setOfferForm({ ...offerForm, end_time: e.target.value })}
                    className={inputSurfaceClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="table-header-text">Description (Optional)</label>
                <Input
                  placeholder="Short description..."
                  value={offerForm.offer_description}
                  onChange={(e) => setOfferForm({ ...offerForm, offer_description: e.target.value })}
                  className={inputSurfaceClass}
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-cyan-500/20 px-5 py-4">
              <button
                onClick={() => {
                  setShowOfferForm(false);
                  onResetOfferForm();
                }}
                className={`${secondaryButtonClass} flex-1`}
                disabled={isCreatingOffer || isUpdatingOffer}
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={isCreatingOffer || isUpdatingOffer}
                className={`${primaryButtonClass} flex-1`}
              >
                {isCreatingOffer || isUpdatingOffer ? (
                  <>
                    <Loader2 className="icon-md animate-spin" />
                    {editingOffer ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Check className="icon-md" />
                    {editingOffer ? "Save Changes" : "Create Offer"}
                  </>
                )}
              </button>
            </div>
      </motion.div>
    </div>
  );
}
