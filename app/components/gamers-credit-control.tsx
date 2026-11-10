"use client";

import { creditAuthHeaders } from "@/lib/credit-auth";
import { useAccess } from "@/app/context/AccessContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import React, { useEffect, useState, useRef } from "react";
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
  amount_due?: number;
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
  const {can,selectedCafeId,activeStaff}=useAccess();
  const [drawer,setDrawer]=useState(false),[step,setStep]=useState(1),[accountSearch,setAccountSearch]=useState("");
  const [adjustAmount,setAdjustAmount]=useState(""),[adjustReason,setAdjustReason]=useState(""),[isAdjusting,setIsAdjusting]=useState(false);
  const statementRequest=useRef(0);
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

  const cacheKey = vendorId ? `gamers_credit:${vendorId}:${activeStaff?.id}` : "gamers_credit:0";
  const fetcher = async () => {
    if (!vendorId) return { users: [], accounts: [] };
    const [usersRes, accountsRes] = await Promise.all([
      fetch(`${BOOKING_URL}/api/vendor/${vendorId}/users`, {headers:creditAuthHeaders()}),
      fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/accounts`, { headers: creditAuthHeaders() }),
    ]);
    if(!accountsRes.ok)throw Error("Unable to load credit accounts. Check your access and retry.");
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
    120000, undefined, Boolean(vendorId)
  );

  useEffect(() => { setVendorId(selectedCafeId?Number(selectedCafeId):null);setAccounts([]);setStatementRows([]);setSettleUserId("");setDrawer(false);statementRequest.current++; },[selectedCafeId,activeStaff?.id]);

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
    }).catch(()=>setError("Unable to load credit accounts. Check your access and retry."));
  }, [vendorId, cachedCredit, refreshCredit]);

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
          headers: creditAuthHeaders(),
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
        headers: creditAuthHeaders(),
        body: JSON.stringify({
          user_id: targetUserId,
          customer_name: form.customer_name || null,
          whatsapp_number: form.whatsapp_number || null,
          phone_number: form.phone_number || null,
          email: form.email || null,
          ...(can("staff.manage") ? { address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          city: form.city || null,
          state: form.state || null,
          pincode: form.pincode || null,
          id_proof_type: form.id_proof_type || null,
          id_proof_number: form.id_proof_number || null } : {}),
          confirmed: true,
          credit_limit: Number(form.credit_limit || 0),
          billing_cycle_day: Number(form.billing_cycle_day || 1),
          grace_days: Number(form.grace_days || 0),
          is_active: Boolean(form.is_active),
          notes: form.notes || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || data?.error || "Failed to save account");
      setDrawer(false);
      toast("Credit account saved.");
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
    const requestId=++statementRequest.current;
    setStatementUserId(userId);
    setIsLoadingStatement(true);
    try {
      const res = await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/statement/${userId}`, { headers: creditAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to fetch statement");
      if(requestId===statementRequest.current)setStatementRows(Array.isArray(data?.entries) ? data.entries : []);
    } catch (e) {
      console.error(e);
      if(requestId===statementRequest.current){setStatementRows([]);setError("Unable to load transactions. Please retry.");}
    } finally {
      if(requestId===statementRequest.current)setIsLoadingStatement(false);
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
          confirmed: true,
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
      grace_days: String(account.grace_days ?? 5),
      is_active: Boolean(account.is_active),
      notes: account.notes || "",
    });
    setActiveTab("setup");
    setSettleUserId(String(account.user_id));
    setSetupUserSearch(account.customer_name || user?.name || "");
    setIsCreatingUser(false);
  };

  const adjustBalance=async()=>{
    const account=accounts.find(a=>a.user_id===Number(settleUserId));const change=Number(adjustAmount);
    if(!account||!Number.isFinite(change)||change===0||adjustReason.trim().length<5){setError("Enter a non-zero adjustment and a clear reason.");return}
    if(!window.confirm(`Change ${account.customer_name||'this gamer'}'s balance from ₹${account.outstanding_amount.toFixed(2)} to ₹${(account.outstanding_amount+change).toFixed(2)}? Reason: ${adjustReason}`))return;
    setIsAdjusting(true);setError(null);try{const r=await fetch(`${BOOKING_URL}/api/vendor/${vendorId}/monthly-credit/adjust`,{method:"POST",headers:creditAuthHeaders(),body:JSON.stringify({user_id:account.user_id,amount:change,reason:adjustReason.trim(),confirmed:true})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error||"Unable to save adjustment");setAdjustAmount("");setAdjustReason("");await fetchUsersAndAccounts(true);await fetchStatement(account.user_id);toast("Adjustment recorded.")}catch(e){setError(e instanceof Error?e.message:"Unable to adjust balance")}finally{setIsAdjusting(false)}
  };
  const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', {minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const accountName = (a: MonthlyCreditAccount) => a.customer_name || vendorUsers.find(u=>u.id===a.user_id)?.name || `Gamer #${a.user_id}`;
  const filteredAccounts = accounts.filter(a=>`${accountName(a)} ${a.phone_number||''}`.toLowerCase().includes(accountSearch.toLowerCase()));
  const currentAccount = accounts.find(a=>a.user_id===Number(settleUserId));
  const selectedUser = vendorUsers.find(u=>u.id===Number(form.user_id));
  const existingAccount = accounts.find(a=>a.user_id===Number(form.user_id));
  const inputClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";
  const buttonClass = "rounded-md border px-3 py-2 text-sm disabled:opacity-50";
  const openAccount = (account?: MonthlyCreditAccount) => {
    setError(null);setSetupUserSearch('');setIsCreatingUser(false);setStep(account?2:1);
    if(account)loadAccountIntoForm(account);
    else setForm({user_id:'',customer_name:'',whatsapp_number:'',phone_number:'',email:'',address_line1:'',address_line2:'',city:'',state:'',pincode:'',id_proof_type:'',id_proof_number:'',credit_limit:'',billing_cycle_day:'1',grace_days:'5',is_active:true,notes:''});
    setDrawer(true);
  };
  const field = (key: keyof typeof form,label:string,type='text',limits:Record<string,number>={}) => <label className="space-y-1 text-xs">{label}<input className={inputClass} type={type} value={String(form[key])} {...limits} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}/></label>;
  const openLedger=(a:MonthlyCreditAccount)=>{setSettleUserId(String(a.user_id));setActiveTab('ledger');void fetchStatement(a.user_id);};
  if(!can('credit.manage'))return <p role="alert" className="p-4">Credit management permission is required.</p>;
  return <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-1">
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-semibold">Gamer Credit</h1><button className={buttonClass} onClick={()=>openAccount()}>+ Credit account</button></div>
    {notice&&<p role="status" className="text-sm text-emerald-500">{notice}</p>}{error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
    <div className="flex gap-1 border-b pb-2" role="tablist" aria-label="Gamer Credit">{[['setup','Credit Accounts'],['ledger','Transactions'],['payments','Settings']].map(([id,label])=><button role="tab" aria-selected={activeTab===id} key={id} className={`${buttonClass} ${activeTab===id?'bg-muted font-semibold':''}`} onClick={()=>setActiveTab(id as typeof activeTab)}>{label}</button>)}</div>
    {activeTab==='setup'&&<section className="space-y-3">
      <div className="flex items-center gap-2"><input aria-label="Search credit accounts" placeholder="Search gamer or mobile number" className={`${inputClass} max-w-md`} value={accountSearch} onChange={e=>setAccountSearch(e.target.value)}/><button className={buttonClass} onClick={()=>fetchUsersAndAccounts(true)}>Refresh</button></div>
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{['Gamer','Credit limit','Outstanding','Available','Status',''].map(h=><th className="whitespace-nowrap p-3" key={h}>{h}</th>)}</tr></thead><tbody>{filteredAccounts.map(a=>{const available=Math.max(0,a.credit_limit-a.outstanding_amount);return <tr key={a.id} className="border-t"><td className="p-3 font-medium">{accountName(a)}</td><td className="p-3 tabular-nums">{money(a.credit_limit)}</td><td className="p-3 tabular-nums">{money(a.outstanding_amount)}</td><td className="p-3 tabular-nums">{money(available)}{a.is_active&&a.credit_limit>0&&available<=a.credit_limit*.1&&<span className="block text-xs text-amber-500">{available===0?'Limit reached':'Low credit'}</span>}</td><td className="p-3">{a.is_active?'Active':'Paused'}</td><td className="p-3"><div className="flex gap-2"><button className={buttonClass} onClick={()=>openLedger(a)}>View</button><button className={buttonClass} onClick={()=>openAccount(a)}>Edit</button></div></td></tr>})}</tbody></table>{!filteredAccounts.length&&<p className="p-6 text-center text-sm text-muted-foreground">{isLoadingAccounts?'Loading accounts…':'No credit accounts found.'}</p>}</div>
      <p className="text-xs text-muted-foreground">Limit: maximum credit · Outstanding: unpaid balance · Available: remaining credit. Amount due appears in Transactions.</p>
    </section>}
    {activeTab==='ledger'&&<section className="space-y-4">
      <label className="block max-w-md text-xs">Gamer<select className={`${inputClass} mt-1`} value={settleUserId} onChange={e=>{setStatementRows([]);setSettleUserId(e.target.value)}}><option value="">Select credit account</option>{accounts.map(a=><option key={a.id} value={a.user_id}>{accountName(a)}</option>)}</select></label>
      {currentAccount?<><div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-4">{[['Credit limit',currentAccount.credit_limit],['Outstanding',currentAccount.outstanding_amount],['Available',Math.max(0,currentAccount.credit_limit-currentAccount.outstanding_amount)],['Amount due',currentAccount.amount_due||0]].map(([label,value])=><div key={String(label)}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{money(Number(value))}</p></div>)}</div>
      <p className="text-xs text-muted-foreground">Amount due is the unpaid balance whose due date has arrived. Payments are applied to the oldest due charges.</p>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3"><label className="text-xs">Payment received<input aria-label="Payment received" className={inputClass} type="number" min="0.01" max={currentAccount.outstanding_amount} step="0.01" value={settleAmount} onChange={e=>setSettleAmount(e.target.value)}/></label><label className="text-xs">Method<select className={inputClass} value={settleMode} onChange={e=>setSettleMode(e.target.value)}>{['UPI','Cash','Bank Transfer'].map(m=><option key={m}>{m}</option>)}</select></label><button className={buttonClass} disabled={isSettling||!settleAmount} onClick={()=>{if(window.confirm(`Record ${money(Number(settleAmount))} received by ${settleMode} from ${accountName(currentAccount)}?`))void settleNow()}}>Record payment</button></div>
      <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm">Balance adjustment</summary><div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-xs">Adjustment (₹)<input className={inputClass} type="number" step="0.01" value={adjustAmount} onChange={e=>setAdjustAmount(e.target.value)}/></label><label className="min-w-48 flex-1 text-xs">Reason<input className={inputClass} maxLength={200} value={adjustReason} onChange={e=>setAdjustReason(e.target.value)}/></label><button className={buttonClass} disabled={isAdjusting} onClick={adjustBalance}>Review adjustment</button></div><p className="mt-2 text-xs text-muted-foreground">Positive amounts increase the balance. Negative amounts reduce it. Adjustments do not record money received.</p></details>
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs"><tr>{['Date','Type','Amount','Details','Staff'].map(label=><th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{statementRows.map(r=><tr key={r.id} className="border-t"><td className="whitespace-nowrap p-3">{String(r.created_at||r.booked_date||'—').replace('T',' ').slice(0,16)}</td><td className="p-3 capitalize">{r.entry_type.replaceAll('_',' ')}</td><td className="p-3 tabular-nums">{money(r.amount)}</td><td className="p-3">{r.description||'—'}</td><td className="p-3">{r.staff_name||r.source_channel||'—'}</td></tr>)}</tbody></table>{!statementRows.length&&<p className="p-5 text-center text-sm text-muted-foreground">{isLoadingStatement?'Loading transactions…':'No transactions.'}</p>}</div></>:<p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Select a gamer to review transactions or collect payment.</p>}
    </section>}
    {activeTab==='payments'&&<section className="max-w-3xl space-y-4 rounded-lg border p-4"><h2 className="font-semibold">Account settings</h2><p className="text-sm text-muted-foreground">Set each gamer’s credit limit, billing day, grace period and active status from their account.</p><button className={buttonClass} onClick={()=>setActiveTab('setup')}>Manage accounts</button><dl className="space-y-3 text-sm"><div><dt className="font-medium">Credit controls</dt><dd className="text-muted-foreground">Bookings cannot exceed available credit. Account limits cannot be reduced below the outstanding balance.</dd></div><div><dt className="font-medium">Staff access</dt><dd className="text-muted-foreground">Credit management permission is required. Identity and address details require administrator access.</dd></div><div><dt className="font-medium">Audit trail</dt><dd className="text-muted-foreground">Payments, adjustments and limit changes appear in Transactions with staff attribution.</dd></div></dl></section>}
    <Dialog open={drawer} onOpenChange={open=>{if(!isSavingAccount)setDrawer(open)}}><DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>{existingAccount?'Edit credit account':'New credit account'}</DialogTitle></DialogHeader>
      <p className="text-xs text-muted-foreground">{step===1?'1 · Select gamer':step===2?'2 · Credit settings':'3 · Review and confirm'}</p>
      {step===1&&<div className="space-y-3"><input className={inputClass} aria-label="Search existing gamers" placeholder="Search existing gamer by name, mobile or email" value={setupUserSearch} onChange={e=>setSetupUserSearch(e.target.value)}/>{setupUserSearch.trim()&&vendorUsers.filter(u=>`${u.name} ${u.phone||''} ${u.email||''}`.toLowerCase().includes(setupUserSearch.toLowerCase())).slice(0,8).map(u=><button key={u.id} className="flex w-full justify-between rounded border p-2 text-sm" onClick={()=>{const existing=accounts.find(a=>a.user_id===u.id);if(existing)loadAccountIntoForm(existing);else setForm(p=>({...p,user_id:String(u.id),customer_name:u.name,phone_number:u.phone||'',email:u.email||''}));setIsCreatingUser(false);setStep(2)}}><span>{u.name}</span><span className="text-muted-foreground">{u.phone||u.email}</span></button>)}<button className={buttonClass} onClick={()=>{setIsCreatingUser(true);setStep(2)}}>+ Create new gamer</button></div>}
      {step===2&&<div className="space-y-4"><p className="font-medium">{selectedUser?.name||form.customer_name||'New gamer'}</p>{isCreatingUser&&<div className="grid grid-cols-2 gap-3">{field('customer_name','Player name')}{field('phone_number','Mobile number','tel')}{field('email','Email (optional)','email')}</div>}<div className="grid grid-cols-2 gap-3">{field('credit_limit','Credit limit (₹)','number',{min:0,max:99999999,step:.01})}{field('billing_cycle_day','Billing day (1–28)','number',{min:1,max:28})}{field('grace_days','Grace period (days)','number',{min:0,max:90})}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))}/>Account active</label></div><details className="rounded border p-3"><summary className="cursor-pointer text-sm">Contact details and notes</summary><div className="mt-3 grid grid-cols-2 gap-3">{field('customer_name','Player name')}{field('phone_number','Mobile number','tel')}{field('whatsapp_number','WhatsApp (optional)','tel')}{field('email','Email','email')}{field('notes','Account notes')}</div></details>{can('staff.manage')&&<details className="rounded border p-3"><summary className="cursor-pointer text-sm">Identity and address (optional)</summary><div className="mt-3 grid grid-cols-2 gap-3">{field('address_line1','Address')}{field('address_line2','Address line 2')}{field('city','City')}{field('state','State')}{field('pincode','Postcode')}{field('id_proof_type','ID type')}{field('id_proof_number','ID number')}</div></details>}<button className={buttonClass} onClick={()=>{const limit=Number(form.credit_limit);if(!form.credit_limit||!Number.isFinite(limit)||limit<Number(existingAccount?.outstanding_amount||0)){setError('Enter a limit at least equal to the outstanding balance.');return}setError(null);setStep(3)}}>Review changes</button></div>}
      {step===3&&<div className="space-y-3"><p className="font-medium">{form.customer_name||selectedUser?.name}</p><p className="text-sm">Credit limit: {existingAccount?`${money(existingAccount.credit_limit)} → `:''}{money(Number(form.credit_limit))}</p><p className="text-sm">Outstanding: {money(existingAccount?.outstanding_amount||0)}</p><p className="text-sm">Billing day {form.billing_cycle_day} · {form.grace_days} grace days · {form.is_active?'Active':'Paused'}</p><button className={buttonClass} disabled={isSavingAccount} onClick={saveAccount}>{isSavingAccount?'Saving…':'Confirm and save'}</button></div>}
      {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}{step>1&&<button className={buttonClass} disabled={isSavingAccount} onClick={()=>setStep(step-1)}>Back</button>}
    </DialogContent></Dialog>
  </div>;
}
