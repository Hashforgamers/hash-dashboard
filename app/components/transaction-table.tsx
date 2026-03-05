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
  bookingId?: number | null;
  userName: string;
  userId: number;
  amount: number;
  originalAmount: number;
  discountedAmount: number;
  modeOfPayment: string;
  paymentUseCase?: string;
  bookingType: string;
  settlementStatus: string;
  slotDate: string;
  slotTime: string;
  sourceChannel?: string;
  staffName?: string;
  baseAmount?: number;
  mealsAmount?: number;
  controllerAmount?: number;
  waiveOffAmount?: number;
  taxableAmount?: number;
  gstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalWithTax?: number;
}

type ColumnKey =
  | "bookingId"
  | "slotDate"
  | "slotTime"
  | "userName"
  | "amount"
  | "modeOfPayment"
  | "paymentUseCase"
  | "bookingType"
  | "settlementStatus"
  | "sourceChannel"
  | "staffName"
  | "breakup"
  | "gst"
  | "totalWithTax";

const transactionColumns: Array<{ key: ColumnKey; label: string }> = [
  { key: "bookingId", label: "Booking ID" },
  { key: "slotDate", label: "Booking Date" },
  { key: "slotTime", label: "Transaction Time" },
  { key: "userName", label: "User Name" },
  { key: "amount", label: "Amount" },
  { key: "breakup", label: "Breakup" },
  { key: "gst", label: "GST" },
  { key: "totalWithTax", label: "Total+GST" },
  { key: "modeOfPayment", label: "Mode of Payment" },
  { key: "paymentUseCase", label: "Use Case" },
  { key: "bookingType", label: "Booking Type" },
  { key: "settlementStatus", label: "Settlement Status" },
  { key: "sourceChannel", label: "Source" },
  { key: "staffName", label: "Staff" },
];

function getToken() {
  if (typeof window !== "undefined") {
    const rbacToken = localStorage.getItem("rbac_access_token_v1");
    const jwtToken = localStorage.getItem("jwtToken");
    return rbacToken || jwtToken;
  }
  return null;
}

function getVendorIdFromToken(decoded: any): number | null {
  if (!decoded) return null;

  if (decoded.vendor_id !== undefined && decoded.vendor_id !== null) {
    const n = Number(decoded.vendor_id);
    if (!Number.isNaN(n)) return n;
  }

  if (decoded.sub && typeof decoded.sub === "object" && decoded.sub.id !== undefined && decoded.sub.id !== null) {
    const n = Number(decoded.sub.id);
    if (!Number.isNaN(n)) return n;
  }

  if (typeof decoded.sub === "string" && /^\d+$/.test(decoded.sub)) {
    const n = Number(decoded.sub);
    if (!Number.isNaN(n)) return n;
  }

  return null;
}

export function TransactionTable() {
  const getTodayISODate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getMonthStartISODate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [boolTrans, setBoolTrans] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<string>(getMonthStartISODate());
  const [toDate, setToDate] = useState<string>(getTodayISODate());
  const [appliedFromDate, setAppliedFromDate] = useState<string>(getMonthStartISODate());
  const [appliedToDate, setAppliedToDate] = useState<string>(getTodayISODate());
  const [filters, setFilters] = useState({
    modeOfPayment: null as string | null,
    bookingType: null as string | null,
    settlementStatus: null as string | null,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    bookingId: true,
    slotDate: true,
    slotTime: true,
    userName: true,
    amount: true,
    modeOfPayment: true,
    paymentUseCase: true,
    bookingType: true,
    settlementStatus: true,
    sourceChannel: true,
    staffName: true,
    breakup: true,
    gst: true,
    totalWithTax: true,
  });

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
      const searchFields = [
        String(t.bookingId ?? ""),
        t.userName,
        t.modeOfPayment,
        t.bookingType,
        t.paymentUseCase || "",
        t.sourceChannel || "",
        t.staffName || "",
      ].map((field) => String(field).toLowerCase()
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
    const candidateTokens = typeof window !== "undefined"
      ? [localStorage.getItem("rbac_access_token_v1"), localStorage.getItem("jwtToken")].filter(Boolean) as string[]
      : [];

    let resolvedToken: string | null = null;
    for (const candidate of candidateTokens) {
      try {
        const decoded: any = jwtDecode(candidate);
        const resolvedVendorId = getVendorIdFromToken(decoded);
        if (resolvedVendorId) {
          resolvedToken = candidate;
          setVendorId(resolvedVendorId);
          break;
        }
      } catch {
        // Try next token candidate.
      }
    }

    if (!resolvedToken) {
      // Keep old behavior fallback so we still send token if available.
      resolvedToken = getToken();
    }
    setToken(resolvedToken);
  }, []);

  useEffect(() => {
    if (!vendorId || !token) return;

    const POLL_INTERVAL = 60 * 1000; // 1 minute

    let pollingInterval: NodeJS.Timeout;

    const fromDateApi = (appliedFromDate || getMonthStartISODate()).replaceAll("-", "");
    const toDateApi = (appliedToDate || getTodayISODate()).replaceAll("-", "");
    // Backend route format: /transactionReport/<vendor_id>/<to_date>/<from_date>
    const apiUrl = `${DASHBOARD_URL}/api/transactionReport/${vendorId}/${toDateApi}/${fromDateApi}`;

    const loadData = async () => {
      setBoolTrans(true);

      try {
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
        const sorted = [...(data || [])].sort((a, b) => {
          const aDate = new Date(`${a.slotDate} ${a.slotTime}`).getTime();
          const bDate = new Date(`${b.slotDate} ${b.slotTime}`).getTime();
          return bDate - aDate;
        });
        setTransactions(sorted);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setBoolTrans(false);
      }
    };

    loadData();

    pollingInterval = setInterval(() => {
      loadData();
    }, POLL_INTERVAL);

    return () => clearInterval(pollingInterval);
  }, [vendorId, token, appliedFromDate, appliedToDate]);

  const metrics = useMemo(() => {
    if (!filteredTransactions.length) {
      return {
        total: 0,
        uniqueUsers: 0,
        pendingSettlements: 0,
        cashTransactions: 0,
        cashPct: 0,
      };
    }

    const total = filteredTransactions.reduce(
      (sum, t) => sum + Number(t.totalWithTax ?? t.amount ?? 0),
      0
    );
    const uniqueUsers = new Set(filteredTransactions.map((t) => t.userName)).size;
    const pendingSettlements = filteredTransactions.filter(
      (t) => String(t.settlementStatus || "").toLowerCase() === "pending"
    ).length;
    const cashTransactions = filteredTransactions.filter(
      (t) => String(t.modeOfPayment || "").toLowerCase() === "cash"
    ).length;
    const cashPct = (cashTransactions / filteredTransactions.length) * 100;

    return { total, uniqueUsers, pendingSettlements, cashTransactions, cashPct };
  }, [filteredTransactions]);

  function downloadFilteredData() {
    const companyName = "Hash For Gamers Pvt. Ltd.";
    const gstNumber = "GSTIN: 29ABCDE1234F1Z5"; // example, replace if needed
    const reportTitle = "Transaction Report";
    const reportDate = new Date().toLocaleDateString();
    const selectedRange = `${appliedFromDate} to ${appliedToDate}`;

    const headers = [
      "Booking ID",
      "Booking Date",
      "Transaction Time",
      "User Name",
      "Amount (INR)",
      "Mode of Payment",
      "Booking Type",
      "Settlement Status",
    ];

    const rows = filteredTransactions.map((transaction) => [
      transaction.bookingId ?? "",
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
      `"Range: ${selectedRange}"`,
      "",
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      ...footer.map((line) => line.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `transaction_report_${reportDate.replace(/\//g, "-")}.csv`);
  }

  const groupByUser = (transactions: Transaction[]) => {
    const grouped: Record<number, { userName: string; totalAmount: number; bookings: Transaction[] }> = {};
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

  const [expandedDates, setExpandedDates] = useState<string[]>([]);
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
  const groupedByDate = filteredTransactions.reduce((acc, transaction) => {
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

  const renderTransactionCell = (transaction: Transaction, key: ColumnKey) => {
    switch (key) {
      case "bookingId":
        return <TableCell className="px-4 py-3 text-slate-300">{transaction.bookingId ?? "-"}</TableCell>;
      case "slotDate":
        return <TableCell className="px-4 py-3 text-slate-300">{transaction.slotDate}</TableCell>;
      case "slotTime":
        return <TableCell className="px-4 py-3 text-slate-300">{transaction.slotTime}</TableCell>;
      case "userName":
        return <TableCell className="px-4 py-3 text-slate-100">{transaction.userName}</TableCell>;
      case "amount":
        return <TableCell className="px-4 py-3 text-right font-medium text-slate-100">₹{transaction.amount.toFixed(2)}</TableCell>;
      case "modeOfPayment":
        return (
          <TableCell className="px-4 py-3">
            <Badge variant="secondary" className="bg-slate-700/80 text-slate-200">{transaction.modeOfPayment}</Badge>
          </TableCell>
        );
      case "paymentUseCase":
        return (
          <TableCell className="px-4 py-3">
            <Badge variant="outline" className="border-slate-500/70 text-slate-300">
              {transaction.paymentUseCase || "-"}
            </Badge>
          </TableCell>
        );
      case "bookingType":
        return (
          <TableCell className="px-4 py-3">
            <Badge variant="outline" className="border-slate-500/70 text-slate-300">{transaction.bookingType}</Badge>
          </TableCell>
        );
      case "settlementStatus":
        return (
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
        );
      case "sourceChannel":
        return <TableCell className="px-4 py-3 text-slate-300">{transaction.sourceChannel || "-"}</TableCell>;
      case "staffName":
        return <TableCell className="px-4 py-3 text-slate-300">{transaction.staffName || "-"}</TableCell>;
      case "breakup":
        return (
          <TableCell className="px-4 py-3 text-xs text-slate-300">
            B:{(transaction.baseAmount || 0).toFixed(0)} M:{(transaction.mealsAmount || 0).toFixed(0)} C:{(transaction.controllerAmount || 0).toFixed(0)} W:{(transaction.waiveOffAmount || 0).toFixed(0)}
          </TableCell>
        );
      case "gst":
        return (
          <TableCell className="px-4 py-3 text-xs text-slate-300">
            {transaction.gstRate ? `${transaction.gstRate}%` : "-"}
            {transaction.gstRate
              ? ` | C:${(transaction.cgstAmount || 0).toFixed(2)} S:${(transaction.sgstAmount || 0).toFixed(2)} I:${(transaction.igstAmount || 0).toFixed(2)}`
              : ""}
          </TableCell>
        );
      case "totalWithTax":
        return (
          <TableCell className="px-4 py-3 text-right font-medium text-slate-200">
            ₹{Number(transaction.totalWithTax ?? transaction.amount).toFixed(2)}
          </TableCell>
        );
      default:
        return <TableCell className="px-4 py-3 text-slate-300">-</TableCell>;
    }
  };

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
                ₹{metrics.total.toFixed(2)}
              </div>
              <p className="text-xs text-emerald-400">For selected range</p>
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
              <p className="text-xs text-emerald-400">Distinct customers in view</p>
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
                {metrics.cashPct.toFixed(1)}
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
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[150px] rounded-lg border-slate-600/70 bg-slate-800/70 text-slate-100"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[150px] rounded-lg border-slate-600/70 bg-slate-800/70 text-slate-100"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            initial="hidden"
            animate="visible"
            variants={boxVariants}
            transition={{ duration: 0.1 }}
            className="flex items-center rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700/70"
            onClick={() => {
              if (!fromDate || !toDate) return;
              if (fromDate > toDate) return;
              setAppliedFromDate(fromDate);
              setAppliedToDate(toDate);
            }}
          >
            <span>Apply Range</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            initial="hidden"
            animate="visible"
            variants={boxVariants}
            transition={{ duration: 0.1 }}
            className="flex items-center rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700/70"
            onClick={() => setShowColumnSelector((prev) => !prev)}
          >
            <span>Columns</span>
          </motion.button>
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

      {showColumnSelector && (
        <div className="rounded-lg border border-slate-700 bg-slate-900/85 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">Show/Hide Columns</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  setVisibleColumns((prev) => {
                    const next = { ...prev };
                    transactionColumns.forEach((col) => { next[col.key] = true; });
                    return next;
                  });
                }}
              >
                Select All
              </button>
              <button
                type="button"
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  setVisibleColumns((prev) => {
                    const next = { ...prev };
                    transactionColumns.forEach((col) => { next[col.key] = false; });
                    return next;
                  });
                }}
              >
                Unselect All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {transactionColumns.map((col) => (
              <label key={col.key} className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={visibleColumns[col.key]}
                  onChange={() => {
                    setVisibleColumns((prev) => ({
                      ...prev,
                      [col.key]: !prev[col.key],
                    }));
                  }}
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <FilterComponent
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
          <Table className="min-w-[1500px]">
            <TableHeader className="sticky top-0 bg-slate-800/90 backdrop-blur-sm">
              <TableRow className="border-slate-700 hover:bg-transparent">
                {transactionColumns
                  .filter((col) => visibleColumns[col.key])
                  .map((col) => (
                    <TableHead key={col.key} className="px-4 py-3 font-semibold text-slate-100">
                      {col.key === "breakup" ? (
                        <span className="group relative inline-flex items-center gap-1">
                          <span>{col.label}</span>
                          <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-500 text-[10px] text-slate-400">
                            i
                          </span>
                          <span className="pointer-events-none absolute left-0 top-6 z-50 hidden w-56 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] font-normal text-slate-300 shadow-lg group-hover:block">
                            B = Base amount, M = Meals amount, C = Controller amount, W = Waive-off amount
                          </span>
                        </span>
                      ) : (
                        col.label
                      )}
                    </TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedByDate).map(([slotDate, usersGroup]) => {
                // Calculate total for the day and user count
                const dayTotalAmount = Object.values(usersGroup).reduce((sum, userGroup) => sum + userGroup.totalAmount, 0);
                const userCount = Object.keys(usersGroup).length;
                const visibleCols = transactionColumns.filter((col) => visibleColumns[col.key]);
                const dayTotalTargetKey: ColumnKey | undefined = visibleColumns.totalWithTax
                  ? "totalWithTax"
                  : (visibleColumns.amount ? "amount" : visibleCols[visibleCols.length - 1]?.key);
                return (
                  <React.Fragment key={slotDate}>
                    {/* Slot Date Row */}
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => toggleDateExpand(slotDate)}
                      className="cursor-pointer border-slate-700 transition-colors hover:bg-slate-800/70"
                    >
                      {visibleCols.map((col, idx) => {
                        if (idx === 0) {
                          return (
                            <TableCell key={`${slotDate}_${col.key}_date`} className="px-4 py-3 font-medium text-cyan-200">
                              <span className="inline-flex items-center gap-2">
                                <span className="text-xs">{expandedDates.includes(slotDate) ? "▲" : "▼"}</span>
                                <span>{slotDate}</span>
                              </span>
                            </TableCell>
                          );
                        }

                        if (col.key === dayTotalTargetKey) {
                          return (
                            <TableCell key={`${slotDate}_${col.key}_total`} className="px-4 py-3 text-right font-medium text-cyan-200">
                              ₹{dayTotalAmount.toFixed(2)}
                            </TableCell>
                          );
                        }

                        return <TableCell key={`${slotDate}_${col.key}_empty`} className="px-4 py-3" />;
                      })}
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
                              {transactionColumns
                                .filter((col) => visibleColumns[col.key])
                                .map((col) => (
                                  <React.Fragment key={`${transaction.id}_${col.key}`}>
                                    {renderTransactionCell(transaction, col.key)}
                                  </React.Fragment>
                                ))}
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
