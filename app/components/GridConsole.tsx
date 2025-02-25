import { Monitor, Tv, Gamepad, Headset, Clock } from "lucide-react";
import { useState } from "react";
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
};

type GridConsoleProps = {
  setSelectedAction: (action: null) => void;
};

type CreateBookingFormProps = {
  setShowForm: (show: boolean) => void;
  selectedConsoleType: string;
};

const consoleTypes: ConsoleType[] = [
  {
    type: "PC",
    icon: Monitor,
    color: "grey",
    iconColor: "#7c3aed",
    description: "Gaming PCs and Workstations",
  },
  {
    type: "PS5",
    icon: Tv,
    color: "grey",
    iconColor: "#2563eb",
    description: "PlayStation 5 Gaming Consoles",
  },
  {
    type: "Xbox",
    icon: Gamepad,
    color: "grey",
    iconColor: "#059669",
    description: "Xbox Series Gaming Consoles",
  },
  {
    type: "VR",
    icon: Headset,
    color: "grey",
    iconColor: "#ea580c",
    description: "Virtual Reality Systems",
  },
  // {
  //   type: "PC",
  //   icon: Monitor,
  //   color: "bg-purple-100 dark:bg-purple-950",
  //   iconColor: "#7c3aed",
  //   description: "Gaming PCs and Workstations",
  // },
  // {
  //   type: "PS5",
  //   icon: Tv,
  //   color: "bg-blue-100 dark:bg-blue-950",
  //   iconColor: "#2563eb",
  //   description: "PlayStation 5 Gaming Consoles",
  // },
  // {
  //   type: "Xbox",
  //   icon: Gamepad,
  //   color: "bg-green-100 dark:bg-green-950",
  //   iconColor: "#059669",
  //   description: "Xbox Series Gaming Consoles",
  // },
  // {
  //   type: "VR",
  //   icon: Headset,
  //   color: "bg-orange-100 dark:bg-orange-950",
  //   iconColor: "#ea580c",
  //   description: "Virtual Reality Systems",
  // },
];

const GridConsole: React.FC<GridConsoleProps> = ({ setSelectedAction }) => {
  const [showForm, setShowForm] = useState<boolean>(false);
  const [selectedConsoleType, setSelectedConsoleType] = useState<string>("");

  const handleConsoleTypeClick = (type: string) => {
    setSelectedConsoleType(type);
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
            {consoleTypes.map((console) => (
              <motion.div
                key={console.type}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`cursor-pointer transition-all hover:shadow-lg ${console.color}`}
                  onClick={() => handleConsoleTypeClick(console.type)}
                >
                  <CardHeader>
                    <console.icon
                      className="w-8 h-8 mb-2"
                      style={{ color: console.iconColor }}
                    />
                    <CardTitle>{console.type}</CardTitle>
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
        />
      )}
    </div>
  );
};

interface CreateBookingForm {
  setShowForm: (show: boolean) => void;
  selectedConsoleType: string;
}

const CreateBookingForm: React.FC<CreateBookingFormProps> = ({
  setShowForm,
  selectedConsoleType,
}) => {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [formStep, setFormStep] = useState<number>(1);
  const [paymentType, setPaymentType] = useState<string>("");
  const totalSteps = 3;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with data:", { selectedSlots, paymentType });
    setShowForm(false);
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
                <div className="space-y-2  ">
                  <label htmlFor="name">Name :</label>
                  <input
                    id="name"
                    placeholder="Enter name"
                    className="px-3 rounded py-1"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email">Email :</label>
                  <input
                    id="email"
                    type="email"
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
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary">
                Booking Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="bookingDate">Booking Date :</label>
                  <input
                    id="bookingDate"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    className="px-3 rounded py-1"
                  />
                </div>
                <div className="space-y-2">
                  <label>Slot Time</label>
                  <div className="h-[300px] rounded-md border p-4 overflow-y-auto">
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          className={`px-4 py-2 rounded-lg ${
                            selectedSlots.includes(hour.toString())
                              ? "bg-green-600 text-white"
                              : "bg-gray-400 text-black"
                          }`}
                          onClick={() => handleSlotClick(hour.toString())}
                        >
                          {hour.toString().padStart(2, "0")}:00
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
