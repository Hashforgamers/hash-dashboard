"use client";

import { useMemo, useState, useEffect } from "react";
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
import { jwtDecode } from "jwt-decode";
interface Transaction {
  id: number;
  userName: string;
  amount: number;
  modeOfPayment: string;
  bookingType: string;
  settlementStatus: string;
  slotDate: string;
  slotTime: string;
}
// const token = localStorage.getItem("jwtToken");
// console.log(token);

// if (token) {
//   try {
//     const decoded = JSON.parse(atob(token.split(".")[1])); // Decode JWT payload
//     console.log("Decoded JWT:", decoded);

//     const vendorId = decoded?.sub?.id; // Extract vendor ID
//     console.log("Vendor ID:", vendorId);
//   } catch (error) {
//     console.error("Invalid JWT Token:", error);
//   }
// }

// async function fetchData(): Promise<Record<string, unknown> | null> {
//   try {
//     const response: Response = await fetch(
//       " https://hfg-dashboard.onrender.com/api/transactionReport/1/20250101/20250304"
//     );

//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }
//     return (await response.json()) as Transaction[]; // Return fetched data
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return null;
//   }
// }
const token = localStorage.getItem("jwtToken");
let vendorId: Number = null;
let issuedAt: Number = null;
let expirationTime: Number = null;

if (token) {
  try {
    const decoded = jwtDecode(token); // Decode JWT safely
    console.log("Decoded JWT:", decoded);

    vendorId = decoded?.sub?.id; // Extract Vendor ID
    issuedAt = decoded?.iat; // Extract Issued At (epoch time)
    expirationTime = decoded?.exp; // Extract Expiration Time (epoch time)

    console.log("Vendor ID:", vendorId);
    console.log("Issued At (epoch):", issuedAt);
    console.log("Expiration Time (epoch):", expirationTime);
  } catch (error) {
    console.error("Invalid JWT Token:", error);
  }
}
function convertEpochToYYYYMMDD(epoch: number | null) {
  if (!epoch) return ""; // Handle null case
  const date = new Date(epoch * 1000); // Convert epoch to milliseconds
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Ensure two-digit month
  const day = String(date.getDate()).padStart(2, "0"); // Ensure two-digit day
  return `${year}${month}${day}`;
}

async function fetchData(): Promise<Record<string, unknown> | null> {
  if (!vendorId) {
    console.error("Vendor ID is missing!");
    return null;
  }

  const fromDate = convertEpochToYYYYMMDD(issuedAt);
  const toDate = convertEpochToYYYYMMDD(expirationTime);

  const apiUrl = `https://hfg-dashboard.onrender.com/api/transactionReport/${vendorId}/${fromDate}/${toDate}`;
  console.log("Fetching data from:", apiUrl);

  try {
    const response: Response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

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
}

export function TransactionTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    modeOfPayment: "",
    bookingType: "",
    settlementStatus: "",
  });
  useEffect(() => {
    async function loadTransactions() {
      const data: Transaction[] | null = await fetchData();
      setTransactions(data || []); // ✅ Ensure transactions is always an array
    }
    loadTransactions();
  }, []);
  const metrics = useMemo(() => {
    if (!transactions || transactions.length === 0)
      return {
        total: 0,
        uniqueUsers: 0,
        pendingSettlements: 0,
        cashTransactions: 0,
      };

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
  }, [transactions]); // Recalculate whenever transactions change

  // Filtered transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    // Ensure transactions is always an array before filtering
    if (!Array.isArray(transactions)) return [];

    return transactions.filter((t) => {
      const isModeOfPaymentValid =
        !filters.modeOfPayment ||
        (t.modeOfPayment &&
          t.modeOfPayment.toLowerCase().trim() ===
            filters.modeOfPayment.toLowerCase().trim());

      const isBookingTypeValid =
        !filters.bookingType ||
        (t.bookingType &&
          t.bookingType.toLowerCase().trim() ===
            filters.bookingType.toLowerCase().trim());

      const isSettlementStatusValid =
        !filters.settlementStatus ||
        (t.settlementStatus &&
          t.settlementStatus.toLowerCase().trim() ===
            filters.settlementStatus.toLowerCase().trim());

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
        className="z-2"
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
        className="rounded-md border bg-card "
      >
        <div className="max-h-[600px] overflow-auto ">
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
                    <TableCell>{transaction.amount.toFixed(2)}</TableCell>
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
