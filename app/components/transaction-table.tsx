"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  SearchIcon,
  DollarSignIcon,
  CreditCardIcon,
  UserIcon,
  ClockIcon,
  FilterIcon,
  Download,
} from "lucide-react";
import FilterComponent from "./filterComponenet";
import { saveAs } from "file-saver";

const transactions = [
  {
    id: "1",
    slotDate: "2023-06-01",
    slotTime: "10:00 AM",
    userName: "John Doe",
    amount: 50,
    modeOfPayment: "Credit Card",
    bookingType: "hash",
    settlementStatus: "done",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },

  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },

  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
  {
    id: "2",
    slotDate: "2023-06-02",
    slotTime: "2:00 PM",
    userName: "Jane Smith",
    amount: 75,
    modeOfPayment: "Cash",
    bookingType: "direct",
    settlementStatus: "N/A",
  },
  {
    id: "3",
    slotDate: "2023-06-03",
    slotTime: "11:00 AM",
    userName: "Bob Johnson",
    amount: 60,
    modeOfPayment: "PayPal",
    bookingType: "hash",
    settlementStatus: "pending",
  },
];

export function TransactionTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    modeOfPayment: "",
    bookingType: "",
    settlementStatus: "",
  });

  const metrics = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const uniqueUsers = new Set(transactions.map((t) => t.userName)).size;
    const pendingSettlements = transactions.filter(
      (t) => t.settlementStatus === "pending"
    ).length;
    const cashTransactions = transactions.filter(
      (t) => t.modeOfPayment === "Cash"
    ).length;

    return {
      total,
      uniqueUsers,
      pendingSettlements,
      cashTransactions,
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Check for filters
      const isModeOfPaymentValid =
        !filters.modeOfPayment || t.modeOfPayment === filters.modeOfPayment;
      const isBookingTypeValid =
        !filters.bookingType || t.bookingType === filters.bookingType;
      const isSettlementStatusValid =
        !filters.settlementStatus ||
        t.settlementStatus === filters.settlementStatus;

      // Search term check (case-insensitive)
      const searchFields = [t.userName, t.modeOfPayment, t.bookingType].map(
        (field) => field.toLowerCase()
      );

      const isSearchMatch = searchFields.some((field) =>
        field.includes(searchTerm.toLowerCase())
      );

      // Return true only if all filter conditions and search term match
      return (
        isModeOfPaymentValid &&
        isBookingTypeValid &&
        isSettlementStatusValid &&
        isSearchMatch
      );
    });
  }, [searchTerm, filters, transactions]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const tableVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };
  const boxVariants = {
    hidden: { opacity: 1, scale: 0.5 },
    visible: { opacity: 1, scale: 1 },
    hover: { scale: 1.1 },
  };
  function downloadFilteredData() {
    // Convert the filtered transactions into CSV format
    const header = [
      "Slot Date",
      "Slot Time",
      "User Name",
      "Amount",
      "Mode of Payment",
      "Booking Type",
      "Settlement Status",
    ];

    const rows = filteredTransactions.map((transaction) => [
      transaction.slotDate,
      transaction.slotTime,
      transaction.userName,
      transaction.amount.toFixed(2),
      transaction.modeOfPayment,
      transaction.bookingType,
      transaction.settlementStatus,
    ]);

    // Combine the header and rows into CSV data
    const csvContent = [
      header.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create a Blob from the CSV content and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "filtered_transactions.csv");
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0 }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/20 via-blue-400/20 to-blue-300/20 dark:from-blue-500/30 dark:via-blue-400/30 dark:to-blue-300/20 border-blue-200 dark:border-blue-800 shadow-lg shadow-blue-500/5">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSignIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-50">
                ${metrics.total}
              </div>
              <p className="text-xs text-blue-600/80 dark:text-blue-400">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/20 via-purple-400/20 to-purple-300/20 dark:from-purple-500/30 dark:via-purple-400/30 dark:to-purple-300/20 border-purple-200 dark:border-purple-800 shadow-lg shadow-purple-500/5">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unique Users
              </CardTitle>
              <UserIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-50">
                {metrics.uniqueUsers}
              </div>
              <p className="text-xs text-purple-600/80 dark:text-purple-400">
                +12 since last week
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 via-amber-400/20 to-amber-300/20 dark:from-amber-500/30 dark:via-amber-400/30 dark:to-amber-300/20 border-amber-200 dark:border-amber-800 shadow-lg shadow-amber-500/5">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Settlements
              </CardTitle>
              <ClockIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-50">
                {metrics.pendingSettlements}
              </div>
              <p className="text-xs text-amber-600/80 dark:text-amber-400">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 via-emerald-400/20 to-emerald-300/20 dark:from-emerald-500/30 dark:via-emerald-400/30 dark:to-emerald-300/20 border-emerald-200 dark:border-emerald-800 shadow-lg shadow-emerald-500/5">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cash Transactions
              </CardTitle>
              <CreditCardIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-50">
                {metrics.cashTransactions}
              </div>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400">
                {(
                  (metrics.cashTransactions / transactions.length) *
                  100
                ).toFixed(1)}
                % of total
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search Bar */}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="flex items-center space-x-2"
      >
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <motion.button
          whileHover={{ borderColor: "rgba(255,255,255,0.6)" }}
          initial="hidden" // Initial state
          animate="visible"
          variants={boxVariants}
          transition={{ duration: 0.1 }}
          className=" flex px-3 py-2 border-2  rounded-md text-md text-muted-foreground  "
          onClick={() => setShowFilter(!showFilter)}
        >
          <FilterIcon className="text-muted-foreground h-5 w-5 " />
          <span className="px-1">filter</span>
        </motion.button>
        <motion.button
          whileHover={{ borderColor: "rgba(255,255,255,0.6)" }}
          initial="hidden" // Initial state
          animate="visible"
          variants={boxVariants}
          transition={{ duration: 0.2 }}
          className="flex px-3 py-2 border-2  rounded-md text-md text-muted-foreground "
          onClick={downloadFilteredData}
        >
          <Download className="text-muted-foreground h-5 w-5 " />

          <span className="px-1">Download </span>
        </motion.button>
      </motion.div>
      <FilterComponent
        filters={filters}
        setFilters={setFilters}
        showFilter={showFilter}
        setShowFilter={setShowFilter}
      />

      {/* Transaction Table */}
      <motion.div
        variants={tableVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, delay: 0.5 }}
        className="rounded-md border bg-card"
      >
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Slot Date</TableHead>
                <TableHead className="font-semibold">Slot Time</TableHead>
                <TableHead className="font-semibold">User Name</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Mode of Payment</TableHead>
                <TableHead className="font-semibold">Booking Type</TableHead>
                <TableHead className="font-semibold">
                  Settlement Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredTransactions.map((transaction, index) => (
                  <motion.tr
                    key={`${transaction.id}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <TableCell>{transaction.slotDate}</TableCell>
                    <TableCell>{transaction.slotTime}</TableCell>
                    <TableCell className="font-medium">
                      {transaction.userName}
                    </TableCell>
                    <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {transaction.modeOfPayment}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.bookingType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.settlementStatus === "done"
                            ? "success"
                            : transaction.settlementStatus === "pending"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {transaction.settlementStatus}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
