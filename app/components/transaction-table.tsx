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
import { ArrowUpIcon, ArrowDownIcon, SearchIcon, DollarSignIcon, CreditCardIcon, UserIcon, ClockIcon, FilterIcon, Download } from 'lucide-react';
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
    if (!transactions.length) return { total: 0, uniqueUsers: 0, pendingSettlements: 0, cashTransactions: 0 };

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const uniqueUsers = new Set(transactions.map((t) => t.userName)).size;
    const pendingSettlements = transactions.filter((t) => t.settlementStatus === "pending").length;
    const cashTransactions = transactions.filter(
      (t) => t.modeOfPayment?.toLowerCase() === "cash"
    ).length;

    return { total, uniqueUsers, pendingSettlements, cashTransactions };
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
    <div className="space-y-4 sm:space-y-5">
      {/* <CHANGE> Updated metric cards to use default card styling instead of colorful gradients */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0 }}
        >
          <Card className="gaming-kpi-card rounded-xl border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="dash-kpi-label">
                Total Revenue
              </CardTitle>
              <DollarSignIcon className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="dash-kpi-value !text-xl sm:!text-2xl">
                ₹{metrics.total}
              </div>
              <p className="text-xs text-emerald-400">
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
          <Card className="gaming-kpi-card rounded-xl border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="dash-kpi-label">
                Unique Users
              </CardTitle>
              <UserIcon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="dash-kpi-value !text-xl sm:!text-2xl">
                {metrics.uniqueUsers}
              </div>
              <p className="text-xs text-emerald-400">
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
          <Card className="gaming-kpi-card rounded-xl border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="dash-kpi-label">
                Pending Settlements
              </CardTitle>
              <ClockIcon className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="dash-kpi-value !text-xl sm:!text-2xl">
                {metrics.pendingSettlements}
              </div>
              <p className="text-xs text-yellow-400">
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
          <Card className="gaming-kpi-card rounded-xl border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="dash-kpi-label">
                Cash Transactions
              </CardTitle>
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="dash-kpi-value !text-xl sm:!text-2xl">
                {metrics.cashTransactions}
              </div>
              <p className="text-xs text-muted-foreground">
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

      {/* <CHANGE> Updated search bar and buttons for better responsiveness */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search transactions..."
            className="rounded-lg border-slate-600/70 bg-slate-800/70 pl-8 text-slate-100 placeholder:text-slate-400 focus:border-cyan-400/60"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            initial="hidden"
            animate="visible"
            variants={boxVariants}
            transition={{ duration: 0.1 }}
            className="flex items-center rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700/70"
            onClick={() => setShowFilter(!showFilter)}
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            <span>Filter</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            initial="hidden"
            animate="visible"
            variants={boxVariants}
            transition={{ duration: 0.2 }}
            className="flex items-center rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700/70"
            onClick={downloadFilteredData}
          >
            <Download className="h-4 w-4 mr-2" />
            <span>Download</span>
          </motion.button>
        </div>
      </motion.div>

      <FilterComponent
        className="z-2"
        filters={filters}
        setFilters={setFilters}
        showFilter={showFilter}
        setShowFilter={setShowFilter}
      />

      {/* <CHANGE> Updated table styling to match Figma reference with proper dark theme */}
      <motion.div
        variants={tableVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, delay: 0.5 }}
        className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/60"
      >
        <div className="max-h-[620px] overflow-x-auto overflow-y-auto">
          <Table className="min-w-[980px]">
            <TableHeader className="sticky top-0 bg-slate-800/90 backdrop-blur-sm">
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="px-4 py-3 font-semibold text-slate-100">Slot Date</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-slate-100">Slot Time</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-slate-100">User Name</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-slate-100">Amount</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-slate-100">Mode of Payment</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-slate-100">Booking Type</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-slate-100">Settlement Status</TableHead>
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
                      className="cursor-pointer border-slate-700 transition-colors hover:bg-slate-800/70"
                    >
                      {/* Slot Date */}
                      <TableCell colSpan={1} className="px-4 py-3 font-medium text-cyan-200">
                        <div className="flex items-center justify-between">
                          <span>{slotDate}</span>
                          <span className="text-xs">{expandedDates.includes(slotDate) ? "▲" : "▼"}</span>
                        </div>
                      </TableCell>
                      {/* Empty cells for columns between Date and Amount */}
                      <TableCell colSpan={2} className="px-4 py-3"></TableCell>
                      {/* Total Amount */}
                      <TableCell colSpan={4} className="px-4 py-3 font-medium text-cyan-200">
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
                              className="border-slate-700 transition-colors hover:bg-slate-800/55"
                            >
                              <TableCell className="px-4 py-3 text-slate-300">{transaction.slotDate}</TableCell>
                              <TableCell className="px-4 py-3 text-slate-300">{transaction.slotTime}</TableCell>
                              <TableCell className="px-4 py-3 text-slate-100">{transaction.userName}</TableCell>
                              <TableCell className="px-4 py-3 font-medium text-slate-100">₹{transaction.amount.toFixed(2)}</TableCell>
                              <TableCell className="px-4 py-3">
                                <Badge variant="secondary" className="bg-slate-700/80 text-slate-200">{transaction.modeOfPayment}</Badge>
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <Badge variant="outline" className="border-slate-500/70 text-slate-300">{transaction.bookingType}</Badge>
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <Badge
                                  variant={
                                    transaction.settlementStatus === "done"
                                      ? "default"
                                      : transaction.settlementStatus === "pending"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className={
                                    transaction.settlementStatus === "done"
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                      : transaction.settlementStatus === "pending"
                                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                      : "border-slate-500/70 text-slate-300"
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
