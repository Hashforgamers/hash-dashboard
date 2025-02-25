"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CalendarPlus,
  Edit,
  XCircle,
  Search,
  NotepadText,
  Clock,
  AlertCircle,
  Calendar,
  Users,
  CreditCard,
  FileText,
  CalendarClock,
  ListTodo,
  LucideIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Action as SonnerAction } from "sonner";
import GridConsole from "./GridConsole"; // No curly braces for default export
import { error } from "console";

// const actions = [
//   {
//     type: "create",
//     icon: CalendarPlus,
//     label: "Create New Booking",
//     description: "Book a new gaming session",
//     gradient: "from-blue-500 to-blue-600"
//   },
//   {
//     type: "change",
//     icon: Edit,
//     label: "Change Booking",
//     description: "Modify existing booking details",
//     gradient: "from-green-500 to-green-600"
//   },
//   {
//     type: "reject",
//     icon: XCircle,
//     label: "Reject Booking",
//     description: "Cancel and process refunds",
//     gradient: "from-red-500 to-red-600"
//   },
//   {
//     type: "list",
//     icon: NotepadText,
//     label: "List Booking",
//     description: "View and manage all bookings",
//     gradient: "from-purple-500 to-purple-600"
//   },
// ]

const formSteps = [
  { id: 1, icon: Users, label: "Gamer Info" },
  { id: 2, icon: Calendar, label: "Schedule" },
  { id: 3, icon: FileText, label: "Console" },
  { id: 4, icon: CreditCard, label: "Payment" },
];
// const container = {
//   hidden: { opacity: 0 },
//   show: {
//     opacity: 1,
//     transition: {
//       staggerChildren: 0.1
//     }
//   }
// }

// const item = {
//   hidden: { y: 20, opacity: 0 },
//   show: { y: 0, opacity: 1 }
// }

// const formVariants = {
//   hidden: { opacity: 0, y: 20 },
//   visible: {
//     opacity: 1,
//     y: 0,
//     transition: {
//       duration: 0.3,
//       ease: "easeOut"
//     }
//   },
//   exit: {
//     opacity: 0,
//     y: -20,
//     transition: {
//       duration: 0.2
//     }
//   }
// }

interface BookingAction {
  iconColor: string;
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: {
    light: string;
    dark: string;
    iconLight: string;
    iconDark: string;
  };
}
// async function fetchData() {
//   try {
//     const response = await fetch(
//       "https://hfg-booking.onrender.com/api/getAllBooking/vendor/1/20250216"
//     );

//     if (!response.ok) {
//       console.log("Data is not coming");
//       return null;
//     }

//     const data = await response.json(); // Parse JSON response
//     return "data is comming properly"; // Return the fetched data
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return null;
//   }
// }

const actions: BookingAction[] = [
  {
    type: "create",
    label: "Create Booking",
    description: "Schedule a new appointment",
    icon: CalendarPlus,
    color: "bg-blue-100 dark:bg-blue-950", // Solid colors for light and dark modes
    iconColor: "#2563eb", // Light blue for the icon
  },
  {
    type: "change",
    label: "Change Booking",
    description: "Modify existing appointments",
    icon: CalendarClock,
    color: "bg-purple-100 dark:bg-purple-950", // Solid purple colors
    iconColor: "#7c3aed", // Purple for the icon
  },
  {
    type: "reject",
    label: "Reject Booking",
    description: "Cancel or decline bookings",
    icon: XCircle,
    color: "bg-red-100 dark:bg-red-950", // Solid red colors
    iconColor: "#ef4444", // Red for the icon
  },
  {
    type: "list",
    label: "List Bookings",
    description: "View all appointments",
    icon: ListTodo,
    color: "bg-emerald-100 dark:bg-emerald-950", // Solid green colors
    iconColor: "#059669", // Green for the icon
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const formVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

export function ManageBooking() {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const handleActionClick = (actionType: string) => {
    setSelectedAction(actionType === selectedAction ? null : actionType);
  };

  const renderForm = () => {
    switch (selectedAction) {
      // case "create":
      //   return <CreateBookingForm />;
      case "create":
        // return (
        //   <div className="bg-green-500">
        //     <GridConsole setSelectedAction={setSelectedAction} />;
        //   </div>
        // );
        return <GridConsole setSelectedAction={setSelectedAction} />;

      case "change":
        return <ChangeBookingForm />;
      case "reject":
        return <RejectBookingForm />;
      case "list":
        return <ListBooking />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 p-6">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {actions.map((action) => (
          <motion.div
            key={action.type}
            variants={item}
            onHoverStart={() => setHoveredAction(action.type)}
            onHoverEnd={() => setHoveredAction(null)}
          >
            <Card
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg ${
                action.color
              } ${
                selectedAction === action.type
                  ? "ring-2 ring-primary shadow-lg transform scale-[1.02]"
                  : "hover:scale-[1.02]"
              }`}
              onClick={() => handleActionClick(action.type)}
            >
              <CardContent className="relative flex flex-col items-center justify-center p-6 text-center">
                <div
                  className="p-3 rounded-full"
                  style={{
                    backgroundColor: action.iconColor + "1A", // Add transparency for the icon's background
                    color: action.iconColor, // Icon color
                  }}
                >
                  <action.icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">
                  {action.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {selectedAction && (
          <motion.div
            key={selectedAction}
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative bg-card rounded-lg shadow-lg p-6 border dark:border-gray-800"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-background rounded-lg " />

            <div className="relative">{renderForm()}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateBookingForm() {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [formStep, setFormStep] = useState(1);
  const totalSteps = 4;

  const handleSlotClick = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const nextStep = () => setFormStep((prev) => Math.min(prev + 1, totalSteps));
  const prevStep = () => setFormStep((prev) => Math.max(prev - 1, 1));

  return (
    <form className="space-y-8">
      <div className="flex items-center justify-between mb-8">
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
                  <Input
                    id="name"
                    placeholder="Enter name"
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email"
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary"
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
                  <Input
                    id="bookingDate"
                    type="date"
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                  />
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
                          className={`rounded-full transition-all duration-300 ${
                            selectedSlots.includes(hour.toString())
                              ? "bg-primary text-primary-foreground transform scale-105"
                              : "hover:bg-primary/10"
                          }`}
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
                  <Label htmlFor="consoleType">Choose Console</Label>
                  <Select>
                    <SelectTrigger
                      id="consoleType"
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                    >
                      <SelectValue placeholder="Select console type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PC">Gaming PC</SelectItem>
                      <SelectItem value="PS5">PlayStation 5</SelectItem>
                      <SelectItem value="Xbox">Xbox Series X</SelectItem>
                      <SelectItem value="VR">VR Headset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemNumber">System Number</Label>
                  <Select>
                    <SelectTrigger
                      id="systemNumber"
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                    >
                      <SelectValue placeholder="Select system number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">System 1 - Available</SelectItem>
                      <SelectItem value="2">System 2 - Available</SelectItem>
                      <SelectItem value="3">System 3 - In Use</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <div className="relative">
                    <Input
                      id="totalAmount"
                      type="number"
                      value={selectedSlots.length * 100}
                      readOnly
                      className="pl-8"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <Label>Payment Status</Label>
                <RadioGroup defaultValue="unpaid" className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paid" id="paid" />
                    <Label htmlFor="paid">Paid</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unpaid" id="unpaid" />
                    <Label htmlFor="unpaid">Unpaid</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4 mt-6">
                <Label htmlFor="additionalRequest">Additional Request</Label>
                <Textarea
                  id="additionalRequest"
                  placeholder="Enter any special requests or requirements..."
                  className="min-h-[100px] transition-all duration-300 focus:ring-2 focus:ring-primary"
                />
              </div>

              <Alert className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please review all details before confirming the booking.
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2 mt-6">
                <Checkbox id="terms" />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the terms and conditions
                </Label>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-8">
        {formStep > 1 && (
          <Button type="button" variant="outline" onClick={prevStep}>
            Previous Step
          </Button>
        )}
        {formStep < totalSteps ? (
          <Button type="button" className="ml-auto" onClick={nextStep}>
            Next Step
          </Button>
        ) : (
          <Button type="submit" className="ml-auto">
            Complete Booking
          </Button>
        )}
      </div>
    </form>
  );
}

function ChangeBookingForm() {
  const [bookingId, setBookingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingFound, setBookingFound] = useState(false);

  const handleSearch = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setBookingFound(true);
    }, 1000);
  };

  return (
    <form className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Search Booking</h3>
        <div className="flex space-x-2">
          <div className="flex-grow">
            <Input
              id="bookingId"
              placeholder="Enter Booking ID"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="transition-all duration-300 focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Search className="w-4 h-4" />
              </motion.div>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {bookingFound && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <form className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Search Booking</h3>
                <div className="flex space-x-2">
                  <div className="flex-grow">
                    <Input
                      id="bookingId"
                      placeholder="Enter Booking ID"
                      value={bookingId}
                      onChange={(e) => setBookingId(e.target.value)}
                    />
                  </div>
                  <Button type="button" onClick={handleSearch}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Gamer's Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" defaultValue="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" defaultValue="1234567890" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Booking Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bookingDate">Booking Date</Label>
                    <Input
                      id="bookingDate"
                      type="date"
                      defaultValue="2023-06-15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slot Time</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <Button
                          key={hour}
                          variant="outline"
                          className={`rounded-full ${
                            hour === 14
                              ? "bg-primary text-primary-foreground"
                              : ""
                          }`}
                        >
                          {hour}:00
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Other sections similar to CreateBookingForm, but with pre-filled and disabled fields */}

              <Button type="submit">Update Booking</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function RejectBookingForm() {
  const [bookingId, setBookingId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingFound, setBookingFound] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [repaymentType, setRepaymentType] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);

  const handleSearch = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setBookingFound(true);
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmReject) {
      setConfirmReject(true);
      return;
    }
    // Handle actual rejection
    console.log("Booking rejected", {
      bookingId,
      rejectionReason,
      repaymentType,
    });
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">Search Booking</h3>
        <div className="flex space-x-2">
          <div className="flex-grow">
            <Input
              id="bookingId"
              placeholder="Enter Booking ID"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="transition-all duration-300 focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Search className="w-4 h-4" />
              </motion.div>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {bookingFound && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary">
                Booking Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Booking ID
                        </span>
                        <span className="font-medium">BK-2024-001</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">March 15, 2024</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time Slot</span>
                        <span className="font-medium">14:00 - 16:00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">System</span>
                        <span className="font-medium">Gaming PC 1</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer</span>
                        <span className="font-medium">John Doe</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium">john@example.com</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-medium">+1 234 567 890</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Amount Paid
                        </span>
                        <span className="font-medium">$50.00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary">
                Rejection Details
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a detailed reason for rejecting this booking..."
                    className="min-h-[100px] transition-all duration-300 focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repaymentType">Repayment Method</Label>
                  <Select
                    value={repaymentType}
                    onValueChange={setRepaymentType}
                  >
                    <SelectTrigger
                      id="repaymentType"
                      className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                    >
                      <SelectValue placeholder="Select repayment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refund">
                        Full Refund to Original Payment Method
                      </SelectItem>
                      <SelectItem value="credit">Store Credit</SelectItem>
                      <SelectItem value="reschedule">
                        Reschedule to Another Date
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {confirmReject ? (
              <Alert variant="destructive" className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    Are you sure you want to reject this booking? This action
                    cannot be undone.
                  </span>
                  <div className="flex space-x-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmReject(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="destructive">
                      Confirm Rejection
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={!rejectionReason || !repaymentType}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Booking
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

// Rest of the code remains the same...

function ListBooking() {
  const fetchData = async () => {
    try {
      const response = await fetch(
        "https://hfg-booking.onrender.com/api/getAllBooking/vendor/1/20250216",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          // mode: "cors",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched Data:", data);
      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const getData = async () => {
      const data = await fetchData();
      console.log(data); // Just for debugging
    };

    getData();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");

  const startTimer = (id: string) => {
    setBookings((prevBookings) =>
      prevBookings.map((booking) =>
        booking.id === id
          ? { ...booking, status: "In progress", startTime: Date.now() }
          : booking
      )
    );
    setFilteredBookings((prevFiltered) =>
      prevFiltered.map((booking) =>
        booking.id === id
          ? { ...booking, status: "In progress", startTime: Date.now() }
          : booking
      )
    );
  };

  const [bookings, setBookings] = useState([
    {
      id: "1",
      bookingDate: "2025-02-21",
      bookingTime: "10:00 AM",
      username: "User 1",
      consoleType: "PC1",
      bookedDate: "2025-02-20",
      startTime: null,
      endTime: null,
      status: "Not played",
    },
    {
      id: "2",
      bookingDate: "2025-02-21",
      bookingTime: "11:00 AM",
      username: "User 2",
      consoleType: "PS5-2",
      bookedDate: "2025-02-20",
      startTime: Date.now() - 1800000, // 30 min ago
      endTime: null,
      status: "In progress",
    },
    {
      id: "3",
      bookingDate: "2025-02-21",
      bookingTime: "12:00 PM",
      username: "User 3",
      consoleType: "Xbox-1",
      bookedDate: "2025-02-19",
      startTime: Date.now() - 7200000, // 2 hours ago
      endTime: Date.now() - 3600000, // 1 hour ago
      status: "Completed",
    },
    {
      id: "4",
      bookingDate: "2025-02-21",
      bookingTime: "01:00 PM",
      username: "User 4",
      consoleType: "PC2",
      bookedDate: "2025-02-19",
      startTime: null,
      endTime: null,
      status: "Not played",
    },
    {
      id: "5",
      bookingDate: "2025-02-21",
      bookingTime: "02:00 PM",
      username: "User 5",
      consoleType: "PS5-1",
      bookedDate: "2025-02-18",
      startTime: Date.now() - 3600000, // 1 hour ago
      endTime: null,
      status: "In progress",
    },
    {
      id: "6",
      bookingDate: "2025-02-21",
      bookingTime: "03:00 PM",
      username: "User 6",
      consoleType: "Xbox-2",
      bookedDate: "2025-02-18",
      startTime: Date.now() - 10800000, // 3 hours ago
      endTime: Date.now() - 7200000, // 2 hours ago
      status: "Completed",
    },
    {
      id: "7",
      bookingDate: "2025-02-21",
      bookingTime: "04:00 PM",
      username: "User 7",
      consoleType: "PC3",
      bookedDate: "2025-02-17",
      startTime: null,
      endTime: null,
      status: "Not played",
    },
    {
      id: "8",
      bookingDate: "2025-02-21",
      bookingTime: "05:00 PM",
      username: "User 8",
      consoleType: "PS5-3",
      bookedDate: "2025-02-17",
      startTime: Date.now() - 5400000, // 1.5 hours ago
      endTime: null,
      status: "In progress",
    },
    {
      id: "9",
      bookingDate: "2025-02-21",
      bookingTime: "06:00 PM",
      username: "User 9",
      consoleType: "Xbox-3",
      bookedDate: "2025-02-16",
      startTime: Date.now() - 14400000, // 4 hours ago
      endTime: Date.now() - 10800000, // 3 hours ago
      status: "Completed",
    },
    {
      id: "10",
      bookingDate: "2025-02-21",
      bookingTime: "07:00 PM",
      username: "User 10",
      consoleType: "PC4",
      bookedDate: "2025-02-16",
      startTime: null,
      endTime: null,
      status: "Not played",
    },
  ]);

  const [filteredBookings, setFilteredBookings] = useState(bookings);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    let sorted = [...filteredBookings];
    if (sortConfig) {
      sorted.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    setFilteredBookings(sorted);
  }, [sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction:
        sortConfig?.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const handleSearch = () => {
    if (searchQuery.trim() === "") {
      setFilteredBookings(bookings);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const results = bookings.filter((booking) =>
        Object.values(booking).some((value) =>
          value.toString().toLowerCase().includes(lowerQuery)
        )
      );
      setFilteredBookings(results);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      "Not played": "secondary",
      "In progress": "warning",
      Completed: "success",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <div className="flex-grow">
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="transition-all duration-300 focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Booking ID{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Booking Date{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Booking time{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                UserName{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Console Type{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Booked Date{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Start time{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                End Timer{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Status{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="font-semibold cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("id")}
              >
                Type{" "}
                {sortConfig?.key === "id" &&
                  (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredBookings.map((booking, index) => (
                <motion.tr
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* <TableCell>{booking.id}</TableCell>
                  <TableCell>{booking.time}</TableCell>
                  <TableCell>{booking.system}</TableCell>
                  <TableCell>{booking.user}</TableCell>
                  <TableCell>{booking.status}</TableCell>
                  <TableCell>
                    {booking.status === "Not played" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startTimer(booking.id)}
                      >
                        Start
                      </Button>
                    )}
                  </TableCell> */}
                  <TableCell>{booking.id}</TableCell>
                  <TableCell>{booking.bookingDate}</TableCell>
                  <TableCell>{booking.bookingTime}</TableCell>
                  <TableCell>{booking.username}</TableCell>
                  <TableCell>{booking.consoleType}</TableCell>
                  <TableCell>{booking.bookedDate}</TableCell>
                  <TableCell>
                    {booking.startTime
                      ? new Date(booking.startTime).toLocaleTimeString()
                      : "Not started"}
                  </TableCell>
                  <TableCell>
                    {booking.endTime
                      ? new Date(booking.endTime).toLocaleTimeString()
                      : "Not ended"}
                  </TableCell>

                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>
                    {booking.status === "Not played" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startTimer(booking.id)}
                      >
                        Start
                      </Button>
                    )}
                  </TableCell>

                  {/* <TableCell>{getStatusBadge(booking.status)}</TableCell> */}
                  {/* Other cells */}
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
