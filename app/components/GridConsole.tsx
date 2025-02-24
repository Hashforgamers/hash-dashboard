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
  const totalSteps = 4;

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
    console.log("Form submitted with data:", { selectedSlots });
    setShowForm(false);
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-8">
        <Button
          type="button"
          className="w-8 h-8 font-xl rounded-md"
          onClick={() => setShowForm(false)}
        >
          X
        </Button>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Enter name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
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
                  <Label htmlFor="bookingDate">Booking Date</Label>
                  <Input id="bookingDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Slot Time</Label>
                  <ScrollArea className="h-[300px] rounded-md border p-4">
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <Button
                          key={hour}
                          variant={
                            selectedSlots.includes(hour.toString())
                              ? "default"
                              : "outline"
                          }
                          onClick={() => handleSlotClick(hour.toString())}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          {hour.toString().padStart(2, "0")}:00
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          {formStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary">
                Gaming Console Selection
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="consoleType">Console Type</Label>
                  <Input
                    id="consoleType"
                    value={selectedConsoleType}
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}

          {formStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary">
                Payment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    value={selectedSlots.length * 100}
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-8">
        {formStep > 1 && (
          <Button type="button" onClick={prevStep}>
            Previous Step
          </Button>
        )}
        {formStep < totalSteps ? (
          <Button type="button" onClick={nextStep}>
            Next Step
          </Button>
        ) : (
          <Button type="submit">Complete Booking</Button>
        )}
      </div>
    </form>
  );
};

export default GridConsole;
