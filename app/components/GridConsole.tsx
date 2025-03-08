import { Monitor, Tv, Gamepad, Headset, Clock } from "lucide-react";
import { useState ,useEffect} from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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

  useEffect(() => {
    const fetchAvailableConsoles = async () => {
      try {
        const response = await fetch("https://hfg-booking.onrender.com/api/getAllConsole/vendor/1");
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
  }, []);

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

  const totalSteps = 3;

  // Fetch available slots based on selected date
  const fetchAvailableSlots = async (date: string) => {
    try {
      const response = await fetch(
        `https://hfg-booking.onrender.com/api/getSlots/vendor/1/game/${selectedConsoleTypeId}/${date.replace(/-/g, "")}`
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
  }, [selectedDate, selectedConsoleTypeId]);

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
        "https://hfg-booking.onrender.com/api/newBooking/vendor/1",
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
      console.log("Booking successful:", data);
      alert("Booking successful!");
      setShowForm(false);
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("Error submitting booking. Please try again.");
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          className="w-8 h-8 font-xl rounded-md"
          onClick={() => setShowForm(false)}
        >
          X
        </button>
        <h2 className="text-2xl font-bold">Create New Booking</h2>
        <div className="flex items-center space-x-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-12 rounded-full transition-colors duration-300 ${
                i + 1 === formStep
                  ? "bg-primary"
                  : i + 1 < formStep
                  ? "bg-primary/60"
                  : "bg-primary/20"
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={formStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {formStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary">
                Gamer's Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name">Name :</label>
                  <input
                    id="name"
                    placeholder="Enter name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-3 rounded py-1"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email">Email :</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-3 rounded py-1"
                    placeholder="Enter email"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone">Phone Number :</label>
                  <input
                    className="px-3 rounded py-1"
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary">Booking Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="bookingDate">Booking Date :</label>
                  <input
                    id="bookingDate"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="px-3 rounded py-1"
                  />
                </div>
                <div className="space-y-2">
                  <label>Slot Time</label>
                  <div className="h-[200px] rounded-md border p-4 overflow-y-auto">
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.slot_id}
                          type="button"
                          className={`px-4 py-2 rounded-lg ${
                            selectedSlots.includes(slot.slot_id)
                              ? "bg-emerald-100 dark:bg-emerald-950" // Green if selected
                              : slot.is_available
                              ? "bg-gray-400 text-black" // Gray if available
                              : "bg-red-100 dark:bg-red-950 cursor-not-allowed" // Red and disabled if not available
                          }`}
                          onClick={() => {
                            if (slot.is_available) {
                              handleSlotClick(slot.slot_id);
                            }
                          }}
                          disabled={!slot.is_available} // Disable button if not available
                        >
                          {slot.start_time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {formStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary">
                Payment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="totalAmount">
                    {`Total Amount: ${selectedSlots.length * 100}`}
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <label htmlFor="paymentType">Payment Type:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md text-white border-2 border-white ${
                      paymentType === "Cash" ? "bg-green-600" : ""
                    }`}
                    onClick={() => setPaymentType("Cash")}
                  >
                    Cash
                  </button>

                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md text-white border-2 border-white  ${
                      paymentType === "Online" ? "bg-blue-600" : ""
                    }`}
                    onClick={() => setPaymentType("Online")}
                  >
                    Online
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-8 ">
        {formStep > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="border-2 border-white rounded-md px-2 py-1 "
          >
            Previous Step
          </button>
        )}
        {formStep < totalSteps ? (
          <button
            type="button"
            onClick={nextStep}
            className="border-2 border-white rounded-md px-2 py-1 "
          >
            Next Step
          </button>
        ) : (
          <button
            type="submit"
            className="border-2 border-white rounded-md px-2 py-1 "
          >
            Complete Booking
          </button>
        )}
      </div>
    </form>
  );
};


export default GridConsole;
