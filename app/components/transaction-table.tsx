"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import FilterComponent from "./filterComponenet";
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
import { saveAs } from "file-saver";
import { Badge } from "@/components/ui/badge";
import { jwtDecode } from "jwt-decode";
import React from "react";
import { DASHBOARD_URL} from "@/src/config/env";
import HashLoader from "./ui/HashLoader";

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

function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("jwtToken");
  }
  return null;
}

export function TransactionTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [boolTrans, setBoolTrans] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [issuedAt, setIssuedAt] = useState<number | null>(null);
  const [expirationTime, setExpirationTime] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    modeOfPayment: "",
    bookingType: "",
    settlementStatus: "",
  });
  const [showFilter, setShowFilter] = useState(false);


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

  useEffect(() => {
    const storedToken = getToken();
    setToken(storedToken);

    if (storedToken) {
      try {
        const decoded: any = jwtDecode(storedToken);
        setVendorId(decoded?.sub?.id || null);
        setIssuedAt(decoded?.iat || null);
        setExpirationTime(decoded?.exp || null);
      } catch (error) {
        console.error("Invalid JWT Token:", error);
      }
    }
  }, []);

  function convertEpochToYYYYMMDD(epoch: number | null) {
    if (!epoch) return ""; // Handle null case
    const date = new Date(epoch * 1000); // Convert epoch to milliseconds
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Ensure two-digit month
    const day = String(date.getDate()).padStart(2, "0"); // Ensure two-digit day
    return `${year}${month}${day}`;
  }

  useEffect(() => {
    const storedToken = getToken();
    setToken(storedToken);

    if (storedToken) {
      try {
        const decoded: any = jwtDecode(storedToken);
        setVendorId(decoded?.sub?.id || null);
        setIssuedAt(decoded?.iat || null);
        setExpirationTime(decoded?.exp || null);
      } catch (error) {
        console.error("Invalid JWT Token:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (!vendorId || !issuedAt || !expirationTime || !token) return;

    const CACHE_KEY = `transactions_${vendorId}`;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const POLL_INTERVAL = 60 * 1000; // 1 minute
    let pollingInterval: NodeJS.Timeout;

    const fromDate = convertEpochToYYYYMMDD(issuedAt);
    const toDate = convertEpochToYYYYMMDD(expirationTime);
    const apiUrl = `${DASHBOARD_URL}/api/transactionReport/${vendorId}/${fromDate}/${toDate}`;

    const loadData = async (useCache: boolean) => {
      setBoolTrans(true);
      const now = Date.now();

      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (useCache && cached) {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && now - parsed.timestamp < CACHE_TTL) {
            setTransactions(parsed.data);
            setBoolTrans(false);
            console.log("Loaded transactions from cache");
            return;
          }
        }

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data: Transaction[] = await response.json();
        setTransactions(data || []);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: now }));
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setBoolTrans(false);
      }
    };

    loadData(true); // Load initially from cache if available

    pollingInterval = setInterval(() => {
      loadData(false); // Always refresh on interval
    }, POLL_INTERVAL);

    return () => clearInterval(pollingInterval);
  }, [vendorId, issuedAt, expirationTime, token]);

  const metrics = useMemo(() => {
    if (!transactions.length) return { total: 0, uniqueUsers: 0, pendingSettlements: 0,  cashTransactions: 0,};

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const uniqueUsers = new Set(transactions.map((t) => t.userName)).size;
    const pendingSettlements = transactions.filter((t) => t.settlementStatus === "pending").length;
    const cashTransactions = transactions.filter(
      (t) => t.modeOfPayment?.toLowerCase() === "cash"
    ).length;

    return { total, uniqueUsers, pendingSettlements,  cashTransactions,};
  }, [transactions]);

  function downloadFilteredData() {
    const companyName = "Hash For Gamers Pvt. Ltd.";
    const gstNumber = "GSTIN: 29ABCDE1234F1Z5"; // example, replace if needed
    const reportTitle = "Transaction Report";
    const reportDate = new Date().toLocaleDateString();
  
    const headers = [
      "Slot Date",
      "Slot Time",
      "User Name",
      "Amount (INR)",
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
  
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const gst = totalAmount * 0.18; // Assuming 18% GST
    const totalWithGst = totalAmount + gst;
  
    const footer = [
      [],
      ["Subtotal", "", "", totalAmount.toFixed(2)],
      ["GST (18%)", "", "", gst.toFixed(2)],
      ["Total (INR)", "", "", totalWithGst.toFixed(2)],
    ];
  
    const csvContent = [
      `"${companyName}"`,
      `"${gstNumber}"`,
      `"${reportTitle} - ${reportDate}"`,
      "",
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      ...footer.map((line) => line.join(",")),
    ].join("\n");
  
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `transaction_report_${reportDate.replace(/\//g, "-")}.csv`);
  }

  const groupByUser = (transactions) => {
    const grouped = {};

    transactions.forEach((tx) => {
      if (!grouped[tx.userId]) {
        grouped[tx.userId] = {
          userName: tx.userName,
          totalAmount: 0,
          bookings: [],
        };
      }

      grouped[tx.userId].totalAmount += tx.amount;
      grouped[tx.userId].bookings.push(tx);
    });

    return grouped;
  };

  const [expandedDates, setExpandedDates] = useState<number[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Record<string, number[]>>({});

  
  const toggleDateExpand = (dateKey: string) => {
    setExpandedDates(prev =>
      prev.includes(dateKey) ? prev.filter(d => d !== dateKey) : [...prev, dateKey]
    );
  };
  
  const toggleUserExpand = (dateKey: string, userId: number) => {
    setExpandedUsers(prev => {
      const currentExpanded = prev[dateKey] || [];
      const isExpanded = currentExpanded.includes(userId);
      const updatedUsers = isExpanded
        ? currentExpanded.filter(id => id !== userId)
        : [...currentExpanded, userId];
  
      return {
        ...prev,
        [dateKey]: updatedUsers,
      };
    });
  };
  
  const groupedTransactions = groupByUser(filteredTransactions);
  const groupedByDate = transactions.reduce((acc, transaction) => {
    const { slotDate, userId, userName } = transaction;
    if (!acc[slotDate]) {
      acc[slotDate] = {};
    }
    if (!acc[slotDate][userId]) {
      acc[slotDate][userId] = {
        userName,
        bookings: [],
        totalAmount: 0,
      };
    }
    acc[slotDate][userId].bookings.push(transaction);
    acc[slotDate][userId].totalAmount += transaction.amount;
    return acc;
  }, {} as Record<string, Record<number, { userName: string; bookings: Transaction[]; totalAmount: number }>>);

  if (boolTrans) {
    return <HashLoader className="min-h-[500px]" />;
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
        className="rounded-2xl border bg-card"
      >
        <div className="max-h-[600px] overflow-x-auto overflow-y-auto rounded-2xl">
          <Table className="min-w-full">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="font-semibold text-foreground">Slot Date</TableHead>
                <TableHead className="font-semibold text-foreground">Slot Time</TableHead>
                <TableHead className="font-semibold text-foreground">User Name</TableHead>
                <TableHead className="font-semibold text-foreground">Amount</TableHead>
                <TableHead className="font-semibold text-foreground">Mode of Payment</TableHead>
                <TableHead className="font-semibold text-foreground">Booking Type</TableHead>
                <TableHead className="font-semibold text-foreground">Settlement Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {Object.entries(groupedByDate).map(([slotDate, usersGroup]) => {
                // Calculate total for the day and user count
                const dayTotalAmount = Object.values(usersGroup).reduce((sum, userGroup) => sum + userGroup.totalAmount, 0);
                const userCount = Object.keys(usersGroup).length;

                return (
                  <React.Fragment key={slotDate}>
                    {/* Slot Date Row */}
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => toggleDateExpand(slotDate)}
                      className="cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                    >
                      {/* Slot Date */}
                      <TableCell colSpan={1} className="text-primary font-medium flex items-center justify-between">
                        <span>{slotDate}</span>
                        <span>{expandedDates.includes(slotDate) ? "▲" : "▼"}</span>
                      </TableCell>

                      {/* Empty cells for columns between Date and Amount */}
                      <TableCell colSpan={2}></TableCell>

                      {/* Total Amount */}
                      <TableCell colSpan={2} className="text-primary font-medium">
                        ₹{dayTotalAmount.toFixed(2)}
                      </TableCell>
                    </motion.tr>

                    {/* Bookings under Slot Date */}
                    <AnimatePresence>
                      {expandedDates.includes(slotDate) && (
                        Object.values(usersGroup).flatMap(userGroup =>
                          userGroup.bookings.map((transaction) => (
                            <motion.tr
                              key={transaction.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="hover:bg-accent transition-colors dark:hover:bg-accent/30"
                            >
                              <TableCell>{transaction.slotDate}</TableCell>
                              <TableCell>{transaction.slotTime}</TableCell>
                              <TableCell>{transaction.userName}</TableCell>
                              <TableCell>₹{transaction.amount.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{transaction.modeOfPayment}</Badge>
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
                          ))
                        )
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </motion.div>

    </div>
  );
}
