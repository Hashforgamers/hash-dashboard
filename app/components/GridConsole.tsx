import { Monitor, Tv, Gamepad, Headset, Clock } from "lucide-react";
import { useState ,useEffect} from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { jwtDecode } from "jwt-decode";

import { X, User, Mail, Phone, Calendar, CreditCard, Wallet, ChevronLeft, ChevronRight , CheckCircle, Loader2} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area"; // Ensure this matches your folder structure

type ConsoleType = {
  type: string;
  icon: React.ComponentType<any>;
  color: string;
  iconColor: string;
  description: string;
  name:String,
  id: number | null,
};

type GridConsoleProps = {
  setSelectedAction: (action: null) => void;
};

type CreateBookingFormProps = {
  setShowForm: (show: boolean) => void;
  selectedConsoleType: string;
  selectedConsoleTypeId:number;
};

const consoleTypes: ConsoleType[] = [
  {
    type: "pc",
    icon: Monitor,
    color: "grey",
    iconColor: "#7c3aed",
    description: "Gaming PCs and Workstations",
    name: "PC",
    id:null,
  },
  {
    type: "ps5",
    icon: Tv,
    color: "grey",
    iconColor: "#2563eb",
    description: "PlayStation 5 Gaming Consoles",
    name:"PS5",
    id:null,
  },
  {
    type: "xbox",
    icon: Gamepad,
    color: "grey",
    iconColor: "#059669",
    description: "Xbox Series Gaming Consoles",
    name:"XBox",
    id:null,
  },
  {
    type: "vr",
    icon: Headset,
    color: "grey",
    iconColor: "#ea580c",
    description: "Virtual Reality Systems",
    name:"VR",
    id:null,
  },
];

const GridConsole: React.FC<GridConsoleProps> = (
  { setSelectedAction },
  { game }
) => {
  const [showForm, setShowForm] = useState<boolean>(false);
  const [selectedConsoleType, setSelectedConsoleType] = useState<string>("");
  const [selectedConsoleTypeId, setSelectedConsoleTypeId] = useState<number>(0);
  const [availableConsoles, setAvailableConsoles] = useState<ConsoleType[]>([]);
  const [vendorId, setVendorId] = useState(null);

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []); // empty dependency, runs once on mount

  useEffect(() => {
    const fetchAvailableConsoles = async () => {
      try {
        const response = await fetch(`https://hfg-booking.onrender.com/api/getAllConsole/vendor/${vendorId}`);
        const data = await response.json();
        
        // Update consoleTypes with the id from API response
        const available = consoleTypes.map((console) => {
          const matchedConsole = data.games.find((game: any) => game.console_name.toLowerCase() === console.type.toLowerCase());
          if (matchedConsole) {
            return { ...console, id: matchedConsole.id };
          }
          return console;
        }).filter((console) => console.id !== null); // Only keep consoles with an id

        setAvailableConsoles(available);
      } catch (error) {
        console.error("Error fetching consoles:", error);
      }
    };

    fetchAvailableConsoles();
  }, [vendorId]);

  const handleConsoleTypeClick = (type: string, id:number) => {
    setSelectedConsoleType(type);
    setSelectedConsoleTypeId(id);
    setShowForm(true);
  };

  return (
    <div className="container mx-auto p-5">
      {!showForm ? (
        <div>
          <button
            className="absolute left-0 top-0 hover:bg-gray-300 hover:text-black rounded-full w-8 h-8 flex items-center justify-center"
            onClick={() => setSelectedAction(null)}
          >
            X
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {availableConsoles.map((console) => (
              <motion.div
                key={console.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`cursor-pointer transition-all hover:shadow-lg ${console.color}`}
                  onClick={() => handleConsoleTypeClick(console.type, console.id!)} // Use non-null assertion as we're filtering out null ids
                >
                  <CardHeader>
                    <console.icon
                      className="w-8 h-8 mb-2"
                      style={{ color: console.iconColor }}
                    />
                    <CardTitle>{console.name}</CardTitle>
                    <CardDescription>{console.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <CreateBookingForm
          setShowForm={setShowForm}
          selectedConsoleType={selectedConsoleType}
          selectedConsoleTypeId={selectedConsoleTypeId}
        />
      )}
    </div>
  );
};

interface CreateBookingForm {
  setShowForm: (show: boolean) => void;
  selectedConsoleType: string;
  selectedConsoleTypeId:number;
}

const CreateBookingForm: React.FC<CreateBookingFormProps> = ({
  setShowForm,
  selectedConsoleType,
  selectedConsoleTypeId,
}) => {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [formStep, setFormStep] = useState<number>(1);
  const [paymentType, setPaymentType] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0] // Default to today
  );
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  // Inside your component
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState(null);

  // Decode token once when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    if (token) {
      const decoded_token = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded_token.sub.id);
    }
  }, []); // empty dependency, runs once on mount


  const totalSteps = 3;

  // Fetch available slots based on selected date
  const fetchAvailableSlots = async (date: string) => {
    try {
      const response = await fetch(
        `https://hfg-booking.onrender.com/api/getSlots/vendor/${vendorId}/game/${selectedConsoleTypeId}/${date.replace(/-/g, "")}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch slots");
      }
      const data = await response.json();
      setAvailableSlots(data.slots || []);
    } catch (error) {
      console.error("Error fetching available slots:", error);
    }
  };

  useEffect(() => {
    fetchAvailableSlots(selectedDate);
  }, [vendorId, selectedDate, selectedConsoleTypeId]);

  const handleSlotClick = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (formStep < totalSteps) setFormStep((prev) => prev + 1);
  };

  const prevStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (formStep > 1) setFormStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const bookingData = {
      consoleType: selectedConsoleType,
      name,
      email,
      phone,
      bookedDate: selectedDate,
      slotId: selectedSlots,
      paymentType,
    };

    try {
      const response = await fetch(
        `https://hfg-booking.onrender.com/api/newBooking/vendor/${vendorId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit booking");
      }

      const data = await response.json();
      setShowForm(false);
    } catch (error) {
      console.error("Error submitting booking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="text-gray-900 dark:text-gray-100">
    <form className="max-w-4xl mx-auto p-6 space-y-8" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          onClick={() => setShowForm(false)}
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-emerald-400">
          Create New Booking
        </h2>
        <div className="flex items-center space-x-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div
              key={i}
              className={`h-2 w-12 rounded-full ${
                i + 1 === formStep
                  ? "bg-emerald-600"
                  : i + 1 < formStep
                  ? "bg-emerald-400"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
              initial={{ scale: 0.8 }}
              animate={{ scale: i + 1 === formStep ? 1 : 0.8 }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={formStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {formStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <User className="w-5 h-5" />
                Gamer's Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'name', label: 'Name', value: name, setter: setName, type: 'text', icon: <User className="w-5 h-5" /> },
                  { id: 'email', label: 'Email', value: email, setter: setEmail, type: 'email', icon: <Mail className="w-5 h-5" /> },
                  { id: 'phone', label: 'Phone Number', value: phone, setter: setPhone, type: 'tel', icon: <Phone className="w-5 h-5" /> }
                ].map(field => (
                  <div key={field.id} className="space-y-2">
                    <label htmlFor={field.id} className="block text-sm font-medium flex items-center gap-2">
                      {field.icon}
                      {field.label}
                    </label>
                    <input
                      id={field.id}
                      type={field.type}
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                               bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 
                               focus:border-transparent transition-colors"
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Booking Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="bookingDate" className="block text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Booking Date
                  </label>
                  <input
                    id="bookingDate"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                             bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 
                             focus:border-transparent transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Available Slots
                  </label>
                  <div className="h-[150px] rounded-lg border border-gray-300 dark:border-gray-600 p-4 overflow-y-auto">
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => (
                        <motion.button
                          key={slot.slot_id}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                            selectedSlots.includes(slot.slot_id)
                              ? "bg-emerald-600 text-white"
                              : slot.is_available
                              ? "bg-gray-100 dark:bg-gray-700 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                              : "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 cursor-not-allowed"
                          }`}
                          onClick={() => {
                            if (slot.is_available) {
                              handleSlotClick(slot.slot_id);
                            }
                          }}
                          disabled={!slot.is_available}
                        >
                          {slot.start_time.slice(0, 5)}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {formStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-lg font-medium flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Total Amount: ${selectedSlots.length * 100}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Payment Type</label>
                  <div className="flex gap-4">
                    {['Cash', 'Online'].map(type => (
                      <motion.button
                        key={type}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPaymentType(type)}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          paymentType === type
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                        }`}
                      >
                        {type}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between pt-8">
        {formStep > 1 && (
          <motion.button
            type="button"
            onClick={prevStep}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 
                     hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </motion.button>
        )}
        <motion.button
          type={formStep === totalSteps ? "submit" : "button"}
          onClick={formStep < totalSteps ? nextStep : undefined}
          whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
          className={`px-6 py-2 rounded-lg font-medium bg-emerald-600 text-white 
                      hover:bg-emerald-700 transition-colors ml-auto flex items-center gap-2
                      ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              Processing...
            </>
          ) : formStep < totalSteps ? (
            <>
              Next
              <ChevronRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Complete Booking
              <CheckCircle className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </form>
  </div>
  );
};


export default GridConsole;
