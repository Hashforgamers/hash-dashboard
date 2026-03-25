"use client";

import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { BOOKING_URL } from "@/src/config/env";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Wallet } from "lucide-react";
import { useModuleCache } from "@/app/hooks/useModuleCache";

interface VendorUser {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface MonthlyCreditAccount {
  id: number;
  vendor_id: number;
  user_id: number;
  credit_limit: number;
  outstanding_amount: number;
  billing_cycle_day: number;
  grace_days: number;
  is_active: boolean;
  notes?: string;
  customer_name?: string;
  whatsapp_number?: string;
  phone_number?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  id_proof_type?: string;
  id_proof_number?: string;
}

interface MonthlyCreditLedgerEntry {
  id: number;
  entry_type: string;
  amount: number;
  description?: string;
  booked_date?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  transaction_id?: number | null;
  source_channel?: string;
  staff_name?: string;
  mode_of_payment?: string;
  payment_use_case?: string;
  booking_type?: string;
}

export default function GamersCreditControl() {
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [vendorUsers, setVendorUsers] = useState<VendorUser[]>([]);
  const [accounts, setAccounts] = useState<MonthlyCreditAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    user_id: "",
    customer_name: "",
    whatsapp_number: "",
    phone_number: "",
    email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    id_proof_type: "",
    id_proof_number: "",
    credit_limit: "",
    billing_cycle_day: "1",
    grace_days: "5",
    is_active: true,
    notes: "",
  });

  const [statementUserId, setStatementUserId] = useState<number | null>(null);
  const [statementRows, setStatementRows] = useState<MonthlyCreditLedgerEntry[]>([]);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);

  const [settleUserId, setSettleUserId] = useState<string>("");
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleMode, setSettleMode] = useState<string>("UPI");
  const [isSettling, setIsSettling] = useState(false);
  const [activeTab, setActiveTab] = useState<"setup" | "ledger" | "payments">("setup");
  const [setupUserSearch, setSetupUserSearch] = useState("");
  const [ledgerUserSearch, setLedgerUserSearch] = useState("");
  const [paymentUserSearch, setPaymentUserSearch] = useState("");

  const cacheKey = vendorId ? `gamers_credit:${vendorId}` : "gamers_credit:0";
  const fetcher = async () => {
    if (!vendorId) return { users: [], accounts: [] };
    const [usersRes, accountsRes] = await Promise.all([
      fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`),
      fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/accounts`),
    ]);
    const users = usersRes.ok ? await usersRes.json() : [];
    const accounts = accountsRes.ok ? await accountsRes.json() : [];
    return {
      users: Array.isArray(users) ? users : [],
      accounts: Array.isArray(accounts?.accounts) ? accounts.accounts : Array.isArray(accounts) ? accounts : [],
    };
  };

  const { data: cachedCredit, refresh: refreshCredit } = useModuleCache<{ users: VendorUser[]; accounts: MonthlyCreditAccount[] }>(
    cacheKey,
    fetcher,
    120000
  );

  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) return;
    try {
      const decoded = jwtDecode<{ sub: { id: number } }>(token);
      setVendorId(decoded.sub.id);
    } catch (e) {
      console.error("Token decode error", e);
    }
  }, []);

  useEffect(() => {
    if (!vendorId) return;
    if (cachedCredit) {
      setVendorUsers(Array.isArray(cachedCredit.users) ? cachedCredit.users : []);
      setAccounts(Array.isArray(cachedCredit.accounts) ? cachedCredit.accounts : []);
      return;
    }
    refreshCredit().then((data) => {
      if (!data) return;
      setVendorUsers(Array.isArray(data.users) ? data.users : []);
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
    }).catch(() => null);
  }, [vendorId]);

  useEffect(() => {
    if (!settleUserId) return;
    fetchStatement(Number(settleUserId));
  }, [settleUserId]);

  const toast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

  const fetchUsersAndAccounts = async (force = false) => {
    if (!vendorId) return;
    setIsLoadingAccounts(true);
    setError(null);
    try {
      const data = await refreshCredit(force);
      if (!data) return;
      setVendorUsers(Array.isArray(data.users) ? data.users : []);
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
    } catch (e) {
      console.error(e);
      setAccounts([]);
      setError("Unable to load gamers credit accounts.");
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const saveAccount = async () => {
    if (!vendorId) return;
    setError(null);
    setIsSavingAccount(true);
    try {
      let targetUserId = Number(form.user_id || 0);

      if (isCreatingUser) {
        if (!form.customer_name.trim()) {
          throw new Error("Customer name is required to create a gamer.");
        }
        if (!form.phone_number.trim() && !form.email.trim() && !form.whatsapp_number.trim()) {
          throw new Error("Phone/WhatsApp or email is required to create a gamer.");
        }

        const createRes = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.customer_name.trim(),
            phone: form.phone_number.trim() || form.whatsapp_number.trim() || null,
            email: form.email.trim() || null,
            whatsapp_number: form.whatsapp_number.trim() || null,
            address: [form.address_line1, form.address_line2, form.city, form.state, form.pincode]
              .filter(Boolean)
              .join(", "),
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData?.user?.id) {
          throw new Error(createData?.message || "Failed to create gamer");
        }
        targetUserId = Number(createData.user.id);
        setForm((prev) => ({ ...prev, user_id: String(targetUserId) }));
        setIsCreatingUser(false);
        await fetchUsersAndAccounts(true);
      }

      if (!targetUserId) {
        throw new Error("Select gamer or create a new gamer first.");
      }

      const res = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/accounts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: targetUserId,
          customer_name: form.customer_name || null,
          whatsapp_number: form.whatsapp_number || null,
          phone_number: form.phone_number || null,
          email: form.email || null,
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          city: form.city || null,
          state: form.state || null,
          pincode: form.pincode || null,
          id_proof_type: form.id_proof_type || null,
          id_proof_number: form.id_proof_number || null,
          credit_limit: Number(form.credit_limit || 0),
          billing_cycle_day: Number(form.billing_cycle_day || 1),
          grace_days: Number(form.grace_days || 5),
          is_active: Boolean(form.is_active),
          notes: form.notes || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to save account");
      toast("Gamers credit account saved.");
      fetchUsersAndAccounts(true);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Unable to save account.");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const fetchStatement = async (userId: number) => {
    if (!vendorId) return;
    setStatementUserId(userId);
    setIsLoadingStatement(true);
    try {
      const res = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/statement/${userId}`);
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch statement");
      setStatementRows(Array.isArray(data?.entries) ? data.entries : []);
    } catch (e) {
      console.error(e);
      setStatementRows([]);
    } finally {
      setIsLoadingStatement(false);
    }
  };

  const settleNow = async () => {
    if (!vendorId) return;
    if (!settleUserId || Number(settleAmount) <= 0) {
      setError("Select gamer and enter valid settle amount.");
      return;
    }

    setIsSettling(true);
    setError(null);
    try {
      const token = localStorage.getItem("rbac_access_token_v1") || localStorage.getItem("jwtToken");
      const res = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Source": "dashboard",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: Number(settleUserId),
          amount: Number(settleAmount),
          mode_of_payment: settleMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to settle");
      toast(`Settlement recorded. Remaining ₹${Number(data?.remaining_outstanding || 0).toFixed(2)}`);
      setSettleAmount("");
      fetchUsersAndAccounts(true);
      if (statementUserId === Number(settleUserId)) {
        fetchStatement(Number(settleUserId));
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Unable to settle.");
    } finally {
      setIsSettling(false);
    }
  };

  const loadAccountIntoForm = (account: MonthlyCreditAccount) => {
    const user = vendorUsers.find((u) => u.id === account.user_id);
    setForm({
      user_id: String(account.user_id),
      customer_name: account.customer_name || "",
      whatsapp_number: account.whatsapp_number || "",
      phone_number: account.phone_number || "",
      email: account.email || "",
      address_line1: account.address_line1 || "",
      address_line2: account.address_line2 || "",
      city: account.city || "",
      state: account.state || "",
      pincode: account.pincode || "",
      id_proof_type: account.id_proof_type || "",
      id_proof_number: account.id_proof_number || "",
      credit_limit: String(account.credit_limit || ""),
      billing_cycle_day: String(account.billing_cycle_day || 1),
      grace_days: String(account.grace_days || 5),
      is_active: Boolean(account.is_active),
      notes: account.notes || "",
    });
    setActiveTab("setup");
    setSettleUserId(String(account.user_id));
    setSetupUserSearch(account.customer_name || user?.name || "");
    setIsCreatingUser(false);
  };

  const paymentRows = statementRows.filter((row) => row.entry_type === "payment");
  const paymentCollected = paymentRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const avgPayment = paymentRows.length ? paymentCollected / paymentRows.length : 0;
  const lastPaymentDate = paymentRows.length > 0 ? (paymentRows[0].created_at || paymentRows[0].booked_date || "-") : "-";
  const totalOutstanding = accounts.reduce((sum, account) => sum + Number(account.outstanding_amount || 0), 0);
  const activeAccounts = accounts.filter((account) => account.is_active).length;
  const setupFilteredUsers = vendorUsers.filter((u) => {
    const q = setupUserSearch.trim().toLowerCase();
    if (!q) return true;
    return `${u.name} ${u.phone || ""} ${u.email || ""}`.toLowerCase().includes(q);
  });
  const buildAccountLabel = (userId: number) => {
    const account = accounts.find((a) => a.user_id === userId);
    const user = vendorUsers.find((u) => u.id === userId);
    return `${account?.customer_name || user?.name || `User #${userId}`} ${account?.phone_number || user?.phone || account?.email || ""}`.toLowerCase();
  };
  const ledgerFilteredAccounts = accounts.filter((a) => {
    const q = ledgerUserSearch.trim().toLowerCase();
    if (!q) return true;
    return buildAccountLabel(a.user_id).includes(q);
  });
  const paymentFilteredAccounts = accounts.filter((a) => {
    const q = paymentUserSearch.trim().toLowerCase();
    if (!q) return true;
    return buildAccountLabel(a.user_id).includes(q);
  });
  const setupSuggestions = setupFilteredUsers.slice(0, 8);
  const ledgerSuggestions = ledgerFilteredAccounts.slice(0, 8);
  const paymentSuggestions = paymentFilteredAccounts.slice(0, 8);
  const formatUserLabel = (u: VendorUser) => `${u.name}${u.phone ? ` (${u.phone})` : ""}`;
  const formatAccountLabel = (a: MonthlyCreditAccount) => {
    const user = vendorUsers.find((u) => u.id === a.user_id);
    return `${a.customer_name || user?.name || `User #${a.user_id}`}${a.phone_number || user?.phone ? ` (${a.phone_number || user?.phone})` : ""}`;
  };
  const selectSetupUser = (user: VendorUser) => {
    setSetupUserSearch(formatUserLabel(user));
    const existingAccount = accounts.find((a) => a.user_id === user.id);
    if (existingAccount) {
      loadAccountIntoForm(existingAccount);
      setStatementUserId(user.id);
      return;
    }
    setForm((prev) => ({
      ...prev,
      user_id: String(user.id),
      customer_name: user.name || "",
      email: user.email || "",
      phone_number: user.phone || "",
      whatsapp_number: prev.whatsapp_number || user.phone || "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      pincode: "",
      id_proof_type: "",
      id_proof_number: "",
      credit_limit: "",
      billing_cycle_day: "1",
      grace_days: "5",
      is_active: true,
      notes: "",
    }));
    setSettleUserId(String(user.id));
    setStatementUserId(user.id);
    setIsCreatingUser(false);
  };
  const selectLedgerUser = (account: MonthlyCreditAccount) => {
    setLedgerUserSearch(formatAccountLabel(account));
    setSettleUserId(String(account.user_id));
  };
  const selectPaymentUser = (account: MonthlyCreditAccount) => {
    setPaymentUserSearch(formatAccountLabel(account));
    setSettleUserId(String(account.user_id));
  };
  const selectedPaymentAccount = settleUserId ? accounts.find((a) => String(a.user_id) === settleUserId) : null;
  const selectedPaymentUser = settleUserId ? vendorUsers.find((u) => String(u.id) === settleUserId) : null;
  const selectedSetupUser = form.user_id ? vendorUsers.find((u) => String(u.id) === form.user_id) : null;
  const selectedSetupAccount = form.user_id ? accounts.find((a) => String(a.user_id) === form.user_id) : null;
  const selectedLedgerAccount = settleUserId ? accounts.find((a) => String(a.user_id) === settleUserId) : null;
  const selectedLedgerUser = settleUserId ? vendorUsers.find((u) => String(u.id) === settleUserId) : null;
  const isSetupSuggestionsOpen = !isCreatingUser && setupUserSearch.trim().length > 0 && setupSuggestions.length > 0;
  const isLedgerSuggestionsOpen = ledgerUserSearch.trim().length > 0 && ledgerSuggestions.length > 0;
  const isPaymentSuggestionsOpen = paymentUserSearch.trim().length > 0 && paymentSuggestions.length > 0;
  const getAvailableCredit = (account?: MonthlyCreditAccount | null) =>
    Math.max(Number(account?.credit_limit || 0) - Number(account?.outstanding_amount || 0), 0);
  const renderAccountSnapshot = (
    account: MonthlyCreditAccount | null | undefined,
    user: VendorUser | null | undefined,
    emptyLabel: string,
  ) => {
    if (!account && !user) {
      return (
        <div className="dashboard-module-card rounded-xl border border-dashed p-4 text-xs text-slate-600 dark:text-slate-400">
          {emptyLabel}
        </div>
      );
    }

    const customerName = account?.customer_name || user?.name || `User #${account?.user_id || user?.id}`;
    const primaryPhone = account?.phone_number || account?.whatsapp_number || user?.phone || "-";
    const primaryEmail = account?.email || user?.email || "-";
    const availableCredit = getAvailableCredit(account);

    return (
      <div className="dashboard-module-surface rounded-xl p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-cyan-100">{customerName}</p>
              {account ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    account.is_active
                      ? "border border-emerald-300/40 bg-emerald-50 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-200"
                      : "border border-rose-300/40 bg-rose-50 text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/10 dark:text-rose-200"
                  }`}
                >
                  {account.is_active ? "Active" : "Paused"}
                </span>
              ) : (
                <span className="rounded-full border border-amber-300/40 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-200">
                  No credit account yet
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Phone: <span className="text-slate-900 dark:text-slate-200">{primaryPhone}</span>  |  Email: <span className="text-slate-900 dark:text-slate-200">{primaryEmail}</span>
            </p>
          </div>
          {account ? (
            <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
              <p>Cycle Day <span className="font-semibold text-slate-900 dark:text-cyan-100">{Number(account.billing_cycle_day || 1)}</span></p>
              <p>Grace <span className="font-semibold text-slate-900 dark:text-cyan-100">{Number(account.grace_days || 0)} days</span></p>
            </div>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="dashboard-module-card rounded-lg px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Limit</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-cyan-100">₹{Number(account?.credit_limit || 0).toFixed(2)}</p>
          </div>
          <div className="dashboard-module-card rounded-lg px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Outstanding</p>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-200">₹{Number(account?.outstanding_amount || 0).toFixed(2)}</p>
          </div>
          <div className="dashboard-module-card rounded-lg px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Available</p>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">₹{availableCredit.toFixed(2)}</p>
          </div>
        </div>
        {account?.notes ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Notes: <span className="text-slate-900 dark:text-slate-200">{account.notes}</span>
          </p>
        ) : null}
      </div>
    );
  };

  const cardClass = "dashboard-module-surface rounded-xl";
  const primaryButtonClass =
    "ui-action-primary inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 disabled:opacity-50";
  const secondaryButtonClass =
    "ui-action-secondary inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 disabled:opacity-50";
  const inputClass =
    "dashboard-module-input text-slate-900 placeholder:text-slate-400 dark:text-slate-100";
  const selectClass =
    "dashboard-module-input h-10 rounded-md px-3 text-sm text-slate-900 dark:text-slate-100";
  const suggestionClass =
    "dashboard-module-surface max-h-44 overflow-y-auto rounded-md p-1 shadow-xl";
  const summaryCardClass = "dashboard-module-surface rounded-lg p-3";
  const chipCardClass = "dashboard-module-card rounded-md px-3 py-2 text-xs";
  const activeTabClass =
    "dashboard-module-tab-active border border-cyan-400/35 bg-cyan-500/12 text-slate-900 dark:bg-cyan-500/15 dark:text-cyan-100";
  const inactiveTabClass =
    "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-cyan-100";

  return (
    <div className="dashboard-module dashboard-typography flex h-full min-h-0 flex-col gap-4 overflow-y-auto overflow-x-hidden pr-1">
      {notice && (
        <div className="rounded-lg border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-300/40 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={summaryCardClass}>
          <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Allowed Accounts</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-cyan-100">{accounts.length}</p>
        </div>
        <div className={summaryCardClass}>
          <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Active Accounts</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-200">{activeAccounts}</p>
        </div>
        <div className={summaryCardClass}>
          <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Total Outstanding</p>
          <p className="mt-1 text-xl font-semibold text-amber-700 dark:text-amber-200">₹{totalOutstanding.toFixed(2)}</p>
        </div>
      </div>

      <div className="dashboard-module-tab-group flex items-center gap-2 rounded-lg p-2">
        {[
          { id: "setup", label: "Account Setup" },
          { id: "ledger", label: "Ledger & Settlement" },
          { id: "payments", label: "Payments List" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "setup" | "ledger" | "payments")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? activeTabClass
                : inactiveTabClass
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "setup" && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className={`${cardClass} flex min-h-0 flex-col`}>
            <CardHeader className="border-b border-cyan-500/15 pb-3">
              <h3 className="text-sm font-semibold text-cyan-100">Add Allowed Gamer Credit Account</h3>
              <p className="text-xs text-slate-400">
                Capture complete recovery details and monthly credit configuration for transparency.
              </p>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="space-y-3 pb-20">
            <div className={`space-y-2 ${isSetupSuggestionsOpen ? "pb-24" : ""}`}>
              <div className="relative">
                <Input
                  value={setupUserSearch}
                  onChange={(e) => setSetupUserSearch(e.target.value)}
                  placeholder="Type gamer name / phone / email"
                  className={inputClass}
                  disabled={isCreatingUser}
                />
                {isSetupSuggestionsOpen && (
                  <div className={`${suggestionClass} absolute left-0 right-0 top-full z-20 mt-1`}>
                    {setupSuggestions.map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => selectSetupUser(u)}
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                      >
                        <span className="truncate">{u.name}</span>
                        <span className="ml-3 truncate text-slate-500 dark:text-slate-400">{u.phone || u.email || ""}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingUser((prev) => !prev);
                    setForm((prev) => ({ ...prev, user_id: "" }));
                  }}
                  className={secondaryButtonClass}
                >
                  {isCreatingUser ? "Use Existing" : "Create New Gamer"}
                </button>
              </div>
            </div>
            {isCreatingUser && (
              <p className="text-[11px] text-slate-600 dark:text-cyan-200/80">
                New gamer mode: fill recovery/contact fields below and save. User + credit account will be created together.
              </p>
            )}
            {renderAccountSnapshot(
              selectedSetupAccount,
              selectedSetupUser,
              "Select an existing gamer or create a new gamer to review account health before saving."
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input value={form.customer_name} onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))} placeholder="Full Name" className={inputClass} />
              <Input value={form.whatsapp_number} onChange={(e) => setForm((p) => ({ ...p, whatsapp_number: e.target.value }))} placeholder="WhatsApp Number" className={inputClass} />
              <Input value={form.phone_number} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} placeholder="Phone Number" className={inputClass} />
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className={inputClass} />
              <Input value={form.address_line1} onChange={(e) => setForm((p) => ({ ...p, address_line1: e.target.value }))} placeholder="Address Line 1" className={`${inputClass} sm:col-span-2`} />
              <Input value={form.address_line2} onChange={(e) => setForm((p) => ({ ...p, address_line2: e.target.value }))} placeholder="Address Line 2" className={`${inputClass} sm:col-span-2`} />
              <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="City" className={inputClass} />
              <Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} placeholder="State" className={inputClass} />
              <Input value={form.pincode} onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))} placeholder="Pincode" className={inputClass} />
              <Input value={form.id_proof_type} onChange={(e) => setForm((p) => ({ ...p, id_proof_type: e.target.value }))} placeholder="ID Proof Type (Aadhaar/PAN)" className={inputClass} />
              <Input value={form.id_proof_number} onChange={(e) => setForm((p) => ({ ...p, id_proof_number: e.target.value }))} placeholder="ID Proof Number" className={inputClass} />
              <Input type="number" min={0} value={form.credit_limit} onChange={(e) => setForm((p) => ({ ...p, credit_limit: e.target.value }))} placeholder="Credit Limit ₹" className={inputClass} />
              <Input type="number" min={1} max={28} value={form.billing_cycle_day} onChange={(e) => setForm((p) => ({ ...p, billing_cycle_day: e.target.value }))} placeholder="Billing Day" className={inputClass} />
              <Input type="number" min={0} value={form.grace_days} onChange={(e) => setForm((p) => ({ ...p, grace_days: e.target.value }))} placeholder="Grace Days" className={inputClass} />
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Recovery Notes" className={inputClass} />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
              Credit Account Active
            </label>
              </div>

              <div className="sticky bottom-0 left-0 right-0 mt-3 border-t border-cyan-500/20 bg-white/90 pt-3 backdrop-blur dark:bg-slate-950/80">
                <button onClick={saveAccount} disabled={isSavingAccount} className={primaryButtonClass}>
                  {isSavingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isCreatingUser ? "Create Gamer & Save Account" : "Save Gamer Account"}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardClass} flex min-h-0 flex-col`}>
            <CardHeader className="border-b border-cyan-500/15 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-cyan-100">Allowed Gamers List</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Click `Edit` on any account to prefill and update details.</p>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-2 p-4">
              {isLoadingAccounts ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              ) : accounts.length === 0 ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">No allowed gamers configured yet.</p>
              ) : (
                accounts.map((a) => {
                  const user = vendorUsers.find((u) => u.id === a.user_id);
                  const availableCredit = getAvailableCredit(a);
                  return (
                    <div key={a.id} className="dashboard-module-card rounded p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{a.customer_name || user?.name || `User #${a.user_id}`}</span>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className={`rounded-full px-2 py-0.5 ${a.is_active ? "border border-emerald-300/40 bg-emerald-50 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-200" : "border border-rose-300/40 bg-rose-50 text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/10 dark:text-rose-200"}`}>
                              {a.is_active ? "Active" : "Paused"}
                            </span>
                            <span>{a.phone_number || a.whatsapp_number || a.email || "No contact added"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setActiveTab("ledger");
                              setSettleUserId(String(a.user_id));
                              setLedgerUserSearch(formatAccountLabel(a));
                              fetchStatement(a.user_id);
                            }}
                            className="rounded border border-emerald-300/50 px-2 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-200 dark:hover:bg-slate-800"
                          >
                            Ledger
                          </button>
                          <button
                            onClick={() => loadAccountIntoForm(a)}
                            className="rounded border border-cyan-300/50 px-2 py-1 text-sky-700 hover:bg-cyan-50 dark:border-cyan-400/30 dark:text-cyan-200 dark:hover:bg-slate-800"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <p className="dashboard-module-surface rounded px-2 py-1 text-slate-700 dark:text-slate-300">Limit ₹{Number(a.credit_limit || 0).toFixed(2)}</p>
                        <p className="dashboard-module-surface rounded px-2 py-1 text-slate-700 dark:text-slate-300">Outstanding ₹{Number(a.outstanding_amount || 0).toFixed(2)}</p>
                        <p className="dashboard-module-surface rounded px-2 py-1 text-slate-700 dark:text-slate-300">Available ₹{availableCredit.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "ledger" && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className={`${cardClass} flex min-h-0 flex-col`}>
            <CardHeader className="border-b border-cyan-500/15 pb-3">
              <h3 className="text-sm font-semibold text-cyan-100">Accounts, Settlement & Proof Ledger</h3>
              <p className="text-xs text-slate-400">Track outstanding, collect payment, and keep a full ledger trail.</p>
            </CardHeader>
            <CardContent className="flex flex-1 min-h-0 flex-col space-y-3 overflow-hidden p-4">
              <div className={`grid grid-cols-1 gap-2 sm:grid-cols-4 ${isLedgerSuggestionsOpen ? "pb-24" : ""}`}>
                <div className="space-y-2 sm:col-span-2">
                  <div className="relative">
                    <Input
                      value={ledgerUserSearch}
                      onChange={(e) => setLedgerUserSearch(e.target.value)}
                      placeholder="Type gamer name / phone / email"
                      className={inputClass}
                    />
                    {isLedgerSuggestionsOpen && (
                      <div className={`${suggestionClass} absolute left-0 right-0 top-full z-20 mt-1`}>
                        {ledgerSuggestions.map((a) => (
                          <button
                            type="button"
                            key={a.id}
                            onClick={() => selectLedgerUser(a)}
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                          >
                            <span className="truncate">{formatAccountLabel(a)}</span>
                            <span className="ml-3 text-slate-500 dark:text-slate-400">₹{Number(a.outstanding_amount || 0).toFixed(0)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="Collect Amount ₹"
                  className={inputClass}
                />
                <select
                  value={settleMode}
                  onChange={(e) => setSettleMode(e.target.value)}
                  className={selectClass}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <button onClick={settleNow} disabled={isSettling} className={primaryButtonClass}>
                {isSettling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Collect & Settle
              </button>
              {renderAccountSnapshot(
                selectedLedgerAccount,
                selectedLedgerUser,
                "Select a gamer to see limit, outstanding, available credit, cycle day, and contact details before collecting."
              )}

              {isLoadingAccounts ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              ) : (
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {accounts.map((a) => {
                    const user = vendorUsers.find((u) => u.id === a.user_id);
                    return (
                      <div key={a.id} className="dashboard-module-card rounded p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{a.customer_name || user?.name || `User #${a.user_id}`}</span>
                          <button
                            onClick={() => {
                              setSettleUserId(String(a.user_id));
                              setLedgerUserSearch(formatAccountLabel(a));
                              fetchStatement(a.user_id);
                            }}
                            className="rounded border border-cyan-300/50 px-2 py-1 text-sky-700 hover:bg-cyan-50 dark:border-cyan-400/30 dark:text-cyan-200 dark:hover:bg-slate-800"
                          >
                            View Proof
                          </button>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          Outstanding ₹{Number(a.outstanding_amount || 0).toFixed(2)} | Limit ₹{Number(a.credit_limit || 0).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`${cardClass} flex min-h-0 flex-col`}>
            <CardHeader className="border-b border-cyan-500/15 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-cyan-100">Ledger Proof</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Every charge/payment with date, source, and staff attribution.</p>
            </CardHeader>
            <CardContent className="flex flex-1 min-h-0 flex-col overflow-hidden p-4">
              {statementUserId ? (
                <div className="dashboard-module-surface flex min-h-0 flex-1 flex-col rounded p-2 text-xs">
                  <p className="mb-2 font-semibold text-slate-900 dark:text-cyan-100">
                    Ledger Proof: {selectedLedgerAccount?.customer_name || selectedLedgerUser?.name || `User #${statementUserId}`}
                  </p>
                  {isLoadingStatement ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  ) : statementRows.length === 0 ? (
                    <p className="text-slate-600 dark:text-slate-400">No entries.</p>
                  ) : (
                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                      {statementRows.map((r) => (
                        <div key={r.id} className="flex items-center justify-between border-b border-slate-200 py-1 last:border-0 dark:border-slate-700">
                          <span className="w-20 text-slate-700 dark:text-slate-300">{r.entry_type}</span>
                          <span className="w-24 text-slate-900 dark:text-slate-100">₹{Number(r.amount || 0).toFixed(2)}</span>
                          <span className="w-24 text-slate-500 dark:text-slate-400">{r.booked_date || "-"}</span>
                          <span className="w-28 truncate text-slate-500 dark:text-slate-400">{r.staff_name || r.source_channel || "-"}</span>
                          <span className="w-16 text-slate-500 dark:text-slate-500">#{r.transaction_id || "-"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400">Select a gamer to view proof ledger.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "payments" && (
        <Card className={`${cardClass} flex min-h-0 flex-col`}>
          <CardHeader className="border-b border-cyan-500/15 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-cyan-100">Payments List</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Track only payment collections for selected gamer with clear totals.</p>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-3 p-4">
            <div className={`grid grid-cols-1 gap-2 sm:grid-cols-4 ${isPaymentSuggestionsOpen ? "pb-24" : ""}`}>
              <div className="space-y-2 sm:col-span-2">
                <div className="relative">
                  <Input
                    value={paymentUserSearch}
                    onChange={(e) => setPaymentUserSearch(e.target.value)}
                    placeholder="Type gamer name / phone / email"
                    className={inputClass}
                  />
                  {isPaymentSuggestionsOpen && (
                    <div className={`${suggestionClass} absolute left-0 right-0 top-full z-20 mt-1`}>
                      {paymentSuggestions.map((a) => (
                        <button
                          type="button"
                          key={a.id}
                          onClick={() => selectPaymentUser(a)}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80"
                        >
                          <span className="truncate">{formatAccountLabel(a)}</span>
                          <span className="ml-3 text-slate-500 dark:text-slate-400">₹{Number(a.outstanding_amount || 0).toFixed(0)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className={chipCardClass}>
                Payments Count: <span className="font-semibold text-slate-900 dark:text-cyan-100">{paymentRows.length}</span>
              </div>
              <div className={chipCardClass}>
                Collected Total: <span className="font-semibold text-emerald-700 dark:text-emerald-200">₹{paymentCollected.toFixed(2)}</span>
              </div>
            </div>
            {renderAccountSnapshot(
              selectedPaymentAccount,
              selectedPaymentUser,
              "Select a gamer to see current credit health and payment behavior."
            )}
            {settleUserId && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <div className={chipCardClass}>
                  Gamer: <span className="font-semibold text-slate-900 dark:text-cyan-100">{selectedPaymentAccount?.customer_name || selectedPaymentUser?.name || `User #${settleUserId}`}</span>
                </div>
                <div className={chipCardClass}>
                  Outstanding: <span className="font-semibold text-amber-700 dark:text-amber-200">₹{Number(selectedPaymentAccount?.outstanding_amount || 0).toFixed(2)}</span>
                </div>
                <div className={chipCardClass}>
                  Avg Collection: <span className="font-semibold text-emerald-700 dark:text-emerald-200">₹{avgPayment.toFixed(2)}</span>
                </div>
                <div className={chipCardClass}>
                  Last Payment: <span className="font-semibold text-slate-900 dark:text-slate-100">{String(lastPaymentDate).replace("T", " ").slice(0, 16)}</span>
                </div>
              </div>
            )}
            {isLoadingStatement ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            ) : paymentRows.length === 0 ? (
              <p className="text-xs text-slate-600 dark:text-slate-400">No payment entries for selected gamer.</p>
            ) : (
              <div className="dashboard-module-surface min-h-0 flex-1 space-y-1 overflow-y-auto rounded p-2">
                <div className="grid grid-cols-7 gap-2 border-b border-slate-200 px-2 pb-1 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <span>Date/Time</span>
                  <span>Amount</span>
                  <span>Mode</span>
                  <span>Source</span>
                  <span>Staff</span>
                  <span>Note</span>
                  <span>Txn</span>
                </div>
                {paymentRows.map((row) => (
                  <div key={row.id} className="dashboard-module-card grid grid-cols-7 gap-2 rounded px-2 py-1 text-xs">
                    <span className="text-slate-700 dark:text-slate-300">{String(row.created_at || row.booked_date || "-").replace("T", " ").slice(0, 16)}</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-200">₹{Number(row.amount || 0).toFixed(2)}</span>
                    <span className="text-slate-900 dark:text-slate-200">{row.mode_of_payment || "-"}</span>
                    <span className="text-slate-500 dark:text-slate-400">{row.source_channel || "-"}</span>
                    <span className="truncate text-slate-500 dark:text-slate-400">{row.staff_name || "-"}</span>
                    <span className="truncate text-slate-500 dark:text-slate-400">{row.description || row.booking_type || row.payment_use_case || "-"}</span>
                    <span className="text-slate-500 dark:text-slate-500">#{row.transaction_id || "-"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
