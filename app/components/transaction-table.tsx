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
import { MobileCompactCard } from "@/components/ui/mobile-compact-card";

interface Transaction {
  id: number;
  bookingId?: number | null;
  userName: string;
  userId: number;
  amount: number;
  appFeeAmount?: number;
  netAmount?: number;
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

interface VendorTaxProfile {
  gst_registered: boolean;
  gst_enabled: boolean;
  gst_rate: number;
  gstin?: string;
}

type ColumnKey =
  | "bookingId"
  | "slotDate"
  | "slotTime"
  | "userName"
  | "amount"
  | "appFeeAmount"
  | "netAmount"
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
  { key: "appFeeAmount", label: "App Fee" },
  { key: "netAmount", label: "Net Amount" },
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
  const [taxProfile, setTaxProfile] = useState<VendorTaxProfile | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    bookingId: true,
    slotDate: true,
    slotTime: true,
    userName: true,
    amount: true,
    appFeeAmount: true,
    netAmount: true,
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

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;

    const loadTaxProfile = async () => {
      try {
        const res = await fetch(`${DASHBOARD_URL}/api/vendor/${vendorId}/tax-profile`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setTaxProfile(data?.profile || null);
        }
      } catch {
        // Keep GST export resilient even if tax profile endpoint fails.
      }
    };

    loadTaxProfile();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const getTransactionTax = (t: Transaction): number => {
    const componentTax = Number(t.cgstAmount || 0) + Number(t.sgstAmount || 0) + Number(t.igstAmount || 0);
    if (componentTax > 0) return componentTax;

    const taxable = Number(t.taxableAmount ?? t.amount ?? 0);
    const rate = Number(t.gstRate ?? (taxProfile?.gst_enabled ? taxProfile.gst_rate : 0) ?? 0);
    if (taxable > 0 && rate > 0) return (taxable * rate) / 100;

    const totalWithTax = Number(t.totalWithTax ?? 0);
    const amount = Number(t.amount ?? 0);
    const derived = totalWithTax - amount;
    return derived > 0 ? derived : 0;
  };

  const getTransactionTotalWithTax = (t: Transaction): number => {
    const totalWithTax = Number(t.totalWithTax ?? 0);
    if (totalWithTax > 0) return totalWithTax;
    const taxable = Number(t.taxableAmount ?? t.amount ?? 0);
    return taxable + getTransactionTax(t);
  };

  const getTransactionCellText = (transaction: Transaction, key: ColumnKey): string => {
    switch (key) {
      case "bookingId":
        return String(transaction.bookingId ?? "-");
      case "slotDate":
        return transaction.slotDate || "-";
      case "slotTime":
        return transaction.slotTime || "-";
      case "userName":
        return transaction.userName || "-";
      case "amount":
        return Number(transaction.amount || 0).toFixed(2);
      case "appFeeAmount":
        return Number(transaction.appFeeAmount || 0).toFixed(2);
      case "netAmount":
        return Number(transaction.netAmount ?? (transaction.amount - (transaction.appFeeAmount || 0))).toFixed(2);
      case "modeOfPayment":
        return transaction.modeOfPayment || "-";
      case "paymentUseCase":
        return transaction.paymentUseCase || "-";
      case "bookingType":
        return transaction.bookingType || "-";
      case "settlementStatus":
        return transaction.settlementStatus || "-";
      case "sourceChannel":
        return transaction.sourceChannel || "-";
      case "staffName":
        return transaction.staffName || "-";
      case "breakup":
        return `Base:${(transaction.baseAmount || 0).toFixed(2)} Meals:${(transaction.mealsAmount || 0).toFixed(2)} Ctrl:${(transaction.controllerAmount || 0).toFixed(2)} Waive:${(transaction.waiveOffAmount || 0).toFixed(2)}`;
      case "gst":
        return `${(transaction.gstRate || 0).toFixed(2)}% | C:${(transaction.cgstAmount || 0).toFixed(2)} S:${(transaction.sgstAmount || 0).toFixed(2)} I:${(transaction.igstAmount || 0).toFixed(2)}`;
      case "totalWithTax":
        return getTransactionTotalWithTax(transaction).toFixed(2);
      default:
        return "-";
    }
  };

  const metrics = useMemo(() => {
    if (!filteredTransactions.length) {
      return {
        total: 0,
        appFeeTotal: 0,
        netTotal: 0,
        uniqueUsers: 0,
        pendingSettlements: 0,
        cashTransactions: 0,
        cashPct: 0,
      };
    }

    const total = filteredTransactions.reduce(
      (sum, t) => sum + getTransactionTotalWithTax(t),
      0
    );
    const appFeeTotal = filteredTransactions.reduce(
      (sum, t) => sum + Number(t.appFeeAmount || 0),
      0
    );
    const netTotal = Math.max(total - appFeeTotal, 0);
    const uniqueUsers = new Set(filteredTransactions.map((t) => t.userName)).size;
    const pendingSettlements = filteredTransactions.filter(
      (t) => String(t.settlementStatus || "").toLowerCase() === "pending"
    ).length;
    const cashTransactions = filteredTransactions.filter(
      (t) => String(t.modeOfPayment || "").toLowerCase() === "cash"
    ).length;
    const cashPct = (cashTransactions / filteredTransactions.length) * 100;

    return { total, appFeeTotal, netTotal, uniqueUsers, pendingSettlements, cashTransactions, cashPct };
  }, [filteredTransactions, taxProfile]);

  function downloadFilteredData() {
    const companyName = "Hash For Gamers Pvt. Ltd.";
    const gstNumber = taxProfile?.gstin ? `GSTIN: ${taxProfile.gstin}` : "GSTIN: N/A";
    const reportTitle = "Transaction Report";
    const reportDate = new Date().toLocaleDateString();
    const selectedRange = `${appliedFromDate} to ${appliedToDate}`;

    const selectedColumns = transactionColumns.filter((col) => visibleColumns[col.key]);
    const headers = selectedColumns.map((col) => col.label);
    const rows = filteredTransactions.map((transaction) =>
      selectedColumns.map((col) => getTransactionCellText(transaction, col.key))
    );

    const subtotal = filteredTransactions.reduce(
      (sum, t) => sum + Number(t.taxableAmount ?? t.amount ?? 0),
      0
    );
    const gst = filteredTransactions.reduce((sum, t) => sum + getTransactionTax(t), 0);
    const totalWithGst = filteredTransactions.reduce((sum, t) => sum + getTransactionTotalWithTax(t), 0);
    const effectiveRate = subtotal > 0 ? ((gst / subtotal) * 100).toFixed(2) : "0.00";

    const footer = [
      [],
      ["Subtotal", "", "", subtotal.toFixed(2)],
      [`GST (${effectiveRate}%)`, "", "", gst.toFixed(2)],
      ["Total (INR)", "", "", totalWithGst.toFixed(2)],
      ["App Fee Total (INR)", "", "", metrics.appFeeTotal.toFixed(2)],
      ["Net Total (INR)", "", "", metrics.netTotal.toFixed(2)],
    ];

    const csvContent = [
      `"${companyName}"`,
      `"${gstNumber}"`,
      `"${reportTitle} - ${reportDate}"`,
      `"Range: ${selectedRange}"`,
      "",
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      "",
      ...footer.map((line) => line.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `transaction_report_${reportDate.replace(/\//g, "-")}.csv`);
  }

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
    acc[slotDate][userId].totalAmount += getTransactionTotalWithTax(transaction);
    return acc;
  }, {} as Record<string, Record<number, { userName: string; bookings: Transaction[]; totalAmount: number }>>);

  const renderTransactionCell = (transaction: Transaction, key: ColumnKey) => {
    switch (key) {
      case "bookingId":
        return <TableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">{transaction.bookingId ?? "-"}</TableCell>;
      case "slotDate":
        return <TableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">{transaction.slotDate}</TableCell>;
      case "slotTime":
        return <TableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">{transaction.slotTime}</TableCell>;
      case "userName":
        return <TableCell className="px-4 py-3 text-slate-900 dark:text-slate-100">{transaction.userName}</TableCell>;
      case "amount":
        return <TableCell className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">₹{transaction.amount.toFixed(2)}</TableCell>;
      case "appFeeAmount":
        return (
          <TableCell className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
            ₹{Number(transaction.appFeeAmount || 0).toFixed(2)}
          </TableCell>
        );
      case "netAmount":
        return (
          <TableCell className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
            ₹{Number(transaction.netAmount ?? (transaction.amount - (transaction.appFeeAmount || 0))).toFixed(2)}
          </TableCell>
        );
      case "modeOfPayment":
        return (
          <TableCell className="px-4 py-3">
            <Badge variant="secondary" className="bg-slate-200 text-slate-900 dark:bg-slate-700/80 dark:text-slate-200">{transaction.modeOfPayment}</Badge>
          </TableCell>
        );
      case "paymentUseCase":
        return (
          <TableCell className="px-4 py-3">
            <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-500/70 dark:text-slate-300">
              {transaction.paymentUseCase || "-"}
            </Badge>
          </TableCell>
        );
      case "bookingType":
        return (
          <TableCell className="px-4 py-3">
            <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-500/70 dark:text-slate-300">{transaction.bookingType}</Badge>
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
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : transaction.settlementStatus === "pending"
                  ? "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/20 dark:text-yellow-400"
                  : "border-slate-300 text-slate-700 dark:border-slate-500/70 dark:text-slate-300"
              }
            >
              {transaction.settlementStatus}
            </Badge>
          </TableCell>
        );
      case "sourceChannel":
        return <TableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">{transaction.sourceChannel || "-"}</TableCell>;
      case "staffName":
        return <TableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">{transaction.staffName || "-"}</TableCell>;
      case "breakup":
        return (
          <TableCell className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
            B:{(transaction.baseAmount || 0).toFixed(0)} M:{(transaction.mealsAmount || 0).toFixed(0)} C:{(transaction.controllerAmount || 0).toFixed(0)} W:{(transaction.waiveOffAmount || 0).toFixed(0)}
          </TableCell>
        );
      case "gst":
        return (
          <TableCell className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
            {transaction.gstRate ? `${transaction.gstRate}%` : "-"}
            {transaction.gstRate
              ? ` | C:${(transaction.cgstAmount || 0).toFixed(2)} S:${(transaction.sgstAmount || 0).toFixed(2)} I:${(transaction.igstAmount || 0).toFixed(2)}`
              : ""}
          </TableCell>
        );
      case "totalWithTax":
        return (
          <TableCell className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-200">
            ₹{getTransactionTotalWithTax(transaction).toFixed(2)}
          </TableCell>
        );
      default:
        return <TableCell className="px-4 py-3 text-slate-700 dark:text-slate-300">-</TableCell>;
    }
  };

  const getSettlementBadgeClass = (status: string) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "done") {
      return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400";
    }
    if (normalized === "pending") {
      return "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/20 dark:text-yellow-400";
    }
    return "border-slate-300 text-slate-700 dark:border-slate-500/70 dark:text-slate-300";
  };

  if (boolTrans) {
    return <HashLoader className="min-h-[500px]" />;
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden sm:gap-5">
      {/* <CHANGE> Updated metric cards to use default card styling instead of colorful gradients */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0 }}
        >
          <Card className="gaming-kpi-card rounded-xl border-cyan-500/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2">
              <CardTitle className="dash-kpi-label">
                Gross Revenue
              </CardTitle>
              <DollarSignIcon className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="dash-kpi-value !text-base sm:!text-2xl">
                ₹{metrics.total.toFixed(2)}
              </div>
              <p className="text-[10px] text-emerald-400 sm:text-xs">
                App Fee: ₹{metrics.appFeeTotal.toFixed(2)} · Net: ₹{metrics.netTotal.toFixed(2)}
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2">
              <CardTitle className="dash-kpi-label">
                Unique Users
              </CardTitle>
              <UserIcon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="dash-kpi-value !text-base sm:!text-2xl">
                {metrics.uniqueUsers}
              </div>
              <p className="text-[10px] text-emerald-400 sm:text-xs">Distinct customers in view</p>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2">
              <CardTitle className="dash-kpi-label">
                Pending Settlements
              </CardTitle>
              <ClockIcon className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="dash-kpi-value !text-base sm:!text-2xl">
                {metrics.pendingSettlements}
              </div>
              <p className="text-[10px] text-yellow-400 sm:text-xs">
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2">
              <CardTitle className="dash-kpi-label">
                Cash Transactions
              </CardTitle>
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="dash-kpi-value !text-base sm:!text-2xl">
                {metrics.cashTransactions}
              </div>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
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
        className="dashboard-toolbar shrink-0 flex-col items-stretch gap-2 md:flex-row md:items-center"
      >
        <div className="relative min-w-0 flex-1 md:min-w-[220px]">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
          <Input
            placeholder="Search transactions..."
            className="dashboard-module-input h-10 w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="dashboard-module-input h-10 w-full md:w-[150px]"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="dashboard-module-input h-10 w-full md:w-[150px]"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            initial="hidden"
            animate="visible"
            variants={boxVariants}
            transition={{ duration: 0.1 }}
            className="dashboard-action-button col-span-1 md:col-auto"
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
            className="dashboard-action-button col-span-1 md:col-auto"
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
            className="dashboard-action-button col-span-1 md:col-auto"
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
            className="dashboard-action-button col-span-1 md:col-auto"
            onClick={downloadFilteredData}
          >
            <Download className="h-4 w-4 mr-2" />
            <span>Download</span>
          </motion.button>
        </div>
      </motion.div>

      {showColumnSelector && (
        <div className="dashboard-module-surface shrink-0 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">Show/Hide Columns</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
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
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
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
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => setShowColumnSelector(false)}
              >
                Close
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {transactionColumns.map((col) => (
              <label key={col.key} className="flex items-center gap-2 text-xs text-slate-900 dark:text-slate-200">
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

      <div className="md:hidden space-y-3 overflow-y-auto pr-1">
        {filteredTransactions.length === 0 ? (
          <MobileCompactCard className="border-slate-300/40 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            No transactions found for selected filters.
          </MobileCompactCard>
        ) : (
          filteredTransactions.map((transaction) => (
            <MobileCompactCard key={`mobile_txn_${transaction.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{transaction.userName || "Unknown"}</p>
                  <p className="text-[11px] text-slate-400">
                    Booking #{transaction.bookingId ?? "-"} · {transaction.slotDate} {transaction.slotTime}
                  </p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${getSettlementBadgeClass(transaction.settlementStatus)}`}>
                  {transaction.settlementStatus || "-"}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-cyan-500/10 bg-slate-950/40 p-2">
                  <p className="text-slate-500">Total</p>
                  <p className="font-semibold text-slate-100">₹{getTransactionTotalWithTax(transaction).toFixed(2)}</p>
                </div>
                <div className="rounded-md border border-cyan-500/10 bg-slate-950/40 p-2">
                  <p className="text-slate-500">App Fee</p>
                  <p className="font-semibold text-slate-100">₹{Number(transaction.appFeeAmount || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-md border border-cyan-500/10 bg-slate-950/40 p-2">
                  <p className="text-slate-500">Payment</p>
                  <p className="font-semibold text-slate-100">{transaction.modeOfPayment || "-"}</p>
                </div>
                <div className="rounded-md border border-cyan-500/10 bg-slate-950/40 p-2">
                  <p className="text-slate-500">Type</p>
                  <p className="font-semibold text-slate-100">{transaction.bookingType || "-"}</p>
                </div>
              </div>
            </MobileCompactCard>
          ))
        )}
      </div>

      {/* <CHANGE> Updated table styling to match Figma reference with proper dark theme */}
      <motion.div
        variants={tableVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, delay: 0.5 }}
        className="dashboard-module-surface relative hidden min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border md:flex"
      >
        <div className="h-full min-h-0 w-full overflow-auto overscroll-contain [scrollbar-gutter:stable_both-edges]">
          <Table className="min-w-[1950px]">
            <TableHeader className="dashboard-module-table-head sticky top-0 backdrop-blur-sm">
              <TableRow className="border-slate-200 hover:bg-transparent dark:border-slate-700">
                {transactionColumns
                  .filter((col) => visibleColumns[col.key])
                  .map((col) => (
                    <TableHead key={col.key} className="px-4 py-3 font-semibold text-white">
                      {col.key === "breakup" ? (
                        <span className="group relative inline-flex items-center gap-1">
                          <span>{col.label}</span>
                          <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-600 dark:border-slate-500 dark:text-slate-400">
                            i
                          </span>
                          <span className="pointer-events-none absolute left-0 top-6 z-50 hidden w-60 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-normal text-slate-700 shadow-lg group-hover:block dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                            B = Base, M = Meals, C = Controller, W = Waive-off
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
                      className="border-slate-200 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800/70"
                    >
                      {visibleCols.map((col, idx) => {
                        if (idx === 0) {
                          return (
                            <TableCell key={`${slotDate}_${col.key}_date`} className="px-4 py-3 font-medium text-sky-700 dark:text-cyan-200">
                              <button
                                type="button"
                                onClick={() => toggleDateExpand(slotDate)}
                                className="inline-flex items-center gap-2 text-left"
                                aria-expanded={expandedDates.includes(slotDate)}
                                aria-label={`Toggle transactions for ${slotDate}`}
                              >
                                <span className="text-xs">{expandedDates.includes(slotDate) ? "▲" : "▼"}</span>
                                <span>{slotDate}</span>
                              </button>
                            </TableCell>
                          );
                        }

                        if (col.key === dayTotalTargetKey) {
                          return (
                            <TableCell key={`${slotDate}_${col.key}_total`} className="px-4 py-3 text-right font-medium text-sky-700 dark:text-cyan-200">
                              ₹{dayTotalAmount.toFixed(2)}
                            </TableCell>
                          );
                        }

                        return <TableCell key={`${slotDate}_${col.key}_empty`} className="px-4 py-3" />;
                      })}
                    </motion.tr>
                    {/* Bookings under Slot Date */}
                    <AnimatePresence>
                      {expandedDates.includes(slotDate) &&
                        Object.entries(usersGroup).flatMap(([userIdKey, userGroup]) => {
                          const userId = Number(userIdKey);
                          const userExpanded = (expandedUsers[slotDate] || []).includes(userId);

                          const userSummaryRow = (
                            <motion.tr
                              key={`${slotDate}_user_${userId}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="border-slate-200 bg-slate-50/80 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800/70"
                            >
                              {visibleCols.map((col, idx) => {
                                if (idx === 0) {
                                  return (
                                    <TableCell key={`${slotDate}_${userId}_${col.key}_summary`} className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                                      <button
                                        type="button"
                                        onClick={() => toggleUserExpand(slotDate, userId)}
                                        className="inline-flex items-center gap-2 text-left"
                                        aria-expanded={userExpanded}
                                        aria-label={`Toggle transactions for ${userGroup.userName}`}
                                      >
                                        <span className="text-xs">{userExpanded ? "▲" : "▼"}</span>
                                        <span>{userGroup.userName}</span>
                                      </button>
                                    </TableCell>
                                  );
                                }
                                if (col.key === "amount" || col.key === "totalWithTax") {
                                  return (
                                    <TableCell key={`${slotDate}_${userId}_${col.key}_sum`} className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                                      ₹{userGroup.totalAmount.toFixed(2)}
                                    </TableCell>
                                  );
                                }
                                if (col.key === "bookingType") {
                                  return (
                                    <TableCell key={`${slotDate}_${userId}_${col.key}_count`} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                      {userGroup.bookings.length} bookings
                                    </TableCell>
                                  );
                                }
                                return <TableCell key={`${slotDate}_${userId}_${col.key}_blank`} className="px-4 py-3" />;
                              })}
                            </motion.tr>
                          );

                          const bookingRows = userExpanded
                            ? userGroup.bookings.map((transaction) => (
                                <motion.tr
                                  key={transaction.id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  transition={{ duration: 0.15 }}
                                  className="border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/55"
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
                            : [];

                          return [userSummaryRow, ...bookingRows];
                        })}
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
