import { motion } from "framer-motion";
import { Search, Monitor, Gamepad2, Gamepad } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const slots = [
  {
    id: "1",
    name: "Nolan Siphron",
    system: "PC2",
    startTime: "10:00 AM",
    status: "Online",
    timer: "05:02:00",
    type: "pc"
  },
  {
    id: "2",
    name: "Angel Botosh",
    system: "PS5 | Set 5",
    startTime: "12:00 PM",
    status: "Online",
    timer: "05:02:00",
    type: "ps5"
  },
  {
    id: "3",
    name: "Maren Dias",
    system: "Xbox | Set 2",
    startTime: "05:00 PM",
    status: "Online",
    timer: "05:02:00",
    type: "xbox"
  },
  {
    id: "4",
    name: "Wilson Baptista",
    system: "PC10",
    startTime: "06:25 PM",
    status: "Online",
    timer: "05:02:00",
    type: "pc"
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function CurrentSlots() {
  return (
    <div className="p-6">
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Current Slots</h2>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">Computers <span className="text-emerald-500">12</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-blue-500" />
                <span className="text-sm">PS5 <span className="text-blue-500">12</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Gamepad className="w-4 h-4 text-purple-500" />
                <span className="text-sm">Xbox <span className="text-purple-500">12</span></span>
              </div>
            </div>
          </div>

          <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-600 dark:text-zinc-400 w-4 h-4" />
          <input
  type="text"
  placeholder="Search slots..."
  className="bg-white/50 border border-zinc-300 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-opacity-50 w-full md:w-64 placeholder-zinc-600 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-400 dark:border-zinc-700 transition-all duration-200 ease-in-out"
/>

          </div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="rounded-lg border border-zinc-800 dark:border-zinc-700 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 dark:border-zinc-700">
                  <TableHead className="text-zinc-400 dark:text-zinc-300">Name</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">System</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">Start Time</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">Status</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">Timer</TableHead>
                  <TableHead className="text-zinc-400 dark:text-zinc-300">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <motion.tr
                    key={slot.id}
                    variants={item}
                    className="border-zinc-800 dark:border-zinc-700"
                  >
                    <TableCell className="text-gray-900 dark:text-white">{slot.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {slot.type === 'pc' && <Monitor className="w-4 h-4 text-emerald-500" />}
                        {slot.type === 'ps5' && <Gamepad2 className="w-4 h-4 text-blue-500" />}
                        {slot.type === 'xbox' && <Gamepad className="w-4 h-4 text-purple-500" />}
                        {slot.system}
                      </div>
                    </TableCell>
                    <TableCell>{slot.startTime}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {slot.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{slot.timer}</span>
                    </TableCell>
                    <TableCell>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1 bg-emerald-500 text-white rounded-md text-sm hover:bg-emerald-600 transition-colors"
                      >
                        Remind
                      </motion.button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
