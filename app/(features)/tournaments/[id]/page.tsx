'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  ChevronRight, Home, Search, Trophy, Users, Download,
  CheckCircle2, XCircle, Clock, CreditCard,
} from 'lucide-react';
import { useEventsToken } from '@/hooks/useEventsToken';
import {
  listEvents, getRegistrations,
  EventItem, Registration,
  EventStatus, RegistrationStatus, PaymentStatus,
} from '@/lib/event-api';
import { jwtDecode } from 'jwt-decode';
import { DashboardLayout } from '@/app/(layout)/dashboard-layout';

const VENDOR_ID = 14; // TODO: replace with auth context

// ─── Badge configs ────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<EventStatus, string> = {
  draft:     'bg-gray-500/20 text-gray-300 border border-gray-500/30',
  published: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  ongoing:   'bg-green-500/20 text-green-300 border border-green-500/30',
  completed: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  canceled:  'bg-red-500/20 text-red-300 border border-red-500/30',
};

const REG_BADGE: Record<RegistrationStatus, string> = {
  confirmed: 'bg-green-500/20 text-green-400',
  pending:   'bg-yellow-500/20 text-yellow-400',
  rejected:  'bg-red-500/20 text-red-400',
  canceled:  'bg-gray-500/20 text-gray-400',
};

const PAY_BADGE: Record<PaymentStatus, string> = {
  paid:      'bg-green-500/20 text-green-400',
  pending:   'bg-yellow-500/20 text-yellow-400',
  failed:    'bg-red-500/20 text-red-400',
  refunded:  'bg-purple-500/20 text-purple-400',
};

const REG_ICON: Record<RegistrationStatus, React.ReactNode> = {
  confirmed: <CheckCircle2 className="w-3 h-3" />,
  pending:   <Clock className="w-3 h-3" />,
  rejected:  <XCircle className="w-3 h-3" />,
  canceled:  <XCircle className="w-3 h-3" />,
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TournamentDetailPage() {
  const router       = useRouter();
  const params       = useParams();
  const searchParams = useSearchParams();
  const eventId      = params.id as string;
   const [vendorId, setVendorId] = useState<number | null>(null)
  const { token, loading: tokenLoading } = useEventsToken(vendorId);

  const [event,         setEvent]         = useState<EventItem | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingEvent,  setLoadingEvent]  = useState(true);
  const [loadingRegs,   setLoadingRegs]   = useState(true);
  const [search,        setSearch]        = useState('');
  const [regFilter,     setRegFilter]     = useState<string>(
    searchParams.get('tab') === 'registrations' ? '' : ''
  );


      useEffect(() => {
      const token = localStorage.getItem("jwtToken")
      if (token) {
        try {
          const decoded_token = jwtDecode<{ sub: { id: number } }>(token)
          console.log('🔑 Decoded vendor ID:', decoded_token.sub.id)
          setVendorId(decoded_token.sub.id)
        } catch (error) {
          console.error('❌ Error decoding JWT token:', error)
        }
      }
    }, [])
  // Fetch event from list (no separate detail endpoint visible yet)
  useEffect(() => {
    if (!token) return;
    listEvents(token)
      .then((evs) => setEvent(evs.find((e) => e.id === eventId) ?? null))
      .catch(console.error)
      .finally(() => setLoadingEvent(false));
  }, [token, eventId]);

  // Fetch registrations
  useEffect(() => {
    if (!token) return;
    getRegistrations(token, eventId)
      .then(setRegistrations)
      .catch(console.error)
      .finally(() => setLoadingRegs(false));
  }, [token, eventId]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const fmtShort = (iso: string) =>
    new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD

  const filteredRegs = registrations.filter((r) => {
    const name = (r.team_name ?? r.contact_name ?? r.team_id ?? '').toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchStatus = regFilter ? r.status === regFilter : true;
    return matchSearch && matchStatus;
  });

  // Stats
  const confirmed = registrations.filter((r) => r.status === 'confirmed').length;
  const pending   = registrations.filter((r) => r.status === 'pending').length;
  const paid      = registrations.filter((r) => r.payment_status === 'paid').length;

  // CSV export
  const exportCSV = () => {
    const headers = ['Team/Player', 'Contact', 'Email', 'Phone', 'Registered', 'Status', 'Payment', 'Waiver'];
    const rows = registrations.map((r) => [
      r.team_name ?? r.contact_name ?? r.team_id,
      r.contact_name ?? '',
      r.contact_email ?? '',
      r.contact_phone ?? '',
      fmtShort(r.created_at),
      r.status,
      r.payment_status,
      r.waiver_signed ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `registrations-${eventId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Guards ──────────────────────────────────────── */
  if (tokenLoading || loadingEvent) return (
    <div className="page-container items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="body-text-muted">Loading tournament...</p>
      </div>
    </div>
  );

  if (!event) return (
    <div className="page-container items-center justify-center">
      <div className="content-card content-card-padding text-center max-w-sm">
        <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="body-text-muted mb-4">Tournament not found.</p>
        <button className="btn-primary" onClick={() => router.push('/tournaments')}>
          Back to Tournaments
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
    <div className="page-container overflow-y-auto">

      {/* ── Breadcrumb ────────────────────────────────── */}
      <nav className="flex items-center gap-1 body-text-muted mb-4 flex-shrink-0 flex-wrap">
        <button onClick={() => router.push('/')} className="hover:text-foreground transition-colors flex items-center gap-1">
          <Home className="icon-xs" /> Home
        </button>
        <ChevronRight className="icon-xs" />
        <button onClick={() => router.push('/tournaments')} className="hover:text-foreground transition-colors">
          Tournaments
        </button>
        <ChevronRight className="icon-xs" />
        <span className="text-foreground truncate max-w-[200px]">{event.title}</span>
      </nav>

      {/* ── Page Header ───────────────────────────────── */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">{event.title}</h1>
          <p className="page-subtitle">Manage tournament details, participants, and match results.</p>
        </div>
        <div className="page-actions flex-wrap">
          <button className="btn-secondary text-sm" onClick={exportCSV}>
            <Download className="icon-sm" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Tournament Details Card ───────────────────── */}
      <div className="content-card content-card-padding mb-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Thumbnail placeholder */}
          <div className="w-full md:w-44 h-32 rounded-xl flex-shrink-0 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-border flex items-center justify-center">
            <Trophy className="w-10 h-10 text-blue-400/40" />
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Tournament Details</h2>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_BADGE[event.status]}`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="body-text-muted mb-1">Start</p>
                <p className="body-text font-medium text-sm">{fmt(event.start_at)}</p>
              </div>
              <div>
                <p className="body-text-muted mb-1">End</p>
                <p className="body-text font-medium text-sm">{fmt(event.end_at)}</p>
              </div>
              <div>
                <p className="body-text-muted mb-1">Total Registrations</p>
                <p className="stat-value-large">{registrations.length}</p>
              </div>
              <div>
                <p className="body-text-muted mb-1">Confirmed</p>
                <p className="stat-value-large text-green-400">{confirmed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Pills ────────────────────────────────── */}
      <div className="stats-grid mb-4 flex-shrink-0">
        {[
          { label: 'Total',     value: registrations.length, color: 'icon-blue',    icon: <Users className="icon-md text-blue-400" />     },
          { label: 'Confirmed', value: confirmed,            color: 'icon-green',   icon: <CheckCircle2 className="icon-md text-green-400" /> },
          { label: 'Pending',   value: pending,              color: 'icon-yellow',  icon: <Clock className="icon-md text-yellow-400" />    },
          { label: 'Paid',      value: paid,                 color: 'icon-emerald', icon: <CreditCard className="icon-md text-emerald-400" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-content">
              <div className="stat-card-layout">
                <div className="stat-card-left">
                  <div className={`stat-card-icon ${color}`}>{icon}</div>
                  <div className="stat-card-text">
                    <p className="stat-label">{label}</p>
                    <p className="stat-value-large">{value}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Registrations Table ───────────────────────── */}
      <div className="full-height-card flex flex-col">
        {/* Table Header / Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="icon-md text-muted-foreground" />
            <h3 className="section-title">Registrations</h3>
            {!loadingRegs && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {filteredRegs.length}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-sm text-muted-foreground" />
              <input
                className="input-field pl-9 py-2 text-sm w-48"
                placeholder="Search teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Status filter */}
            <select
              className="select-field py-2 text-sm w-36"
              value={regFilter}
              onChange={(e) => setRegFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="table-header sticky top-0">
              <tr>
                <th className="table-cell table-header-text text-left">Team / Player</th>
                <th className="table-cell table-header-text text-left">Contact</th>
                <th className="table-cell table-header-text text-left">Registered</th>
                <th className="table-cell table-header-text text-left">Status</th>
                <th className="table-cell table-header-text text-left">Payment</th>
                <th className="table-cell table-header-text text-center">Waiver</th>
              </tr>
            </thead>
            <tbody>
              {loadingRegs ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="table-row animate-pulse">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="h-4 bg-muted rounded w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredRegs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-10 h-10 text-muted-foreground/20" />
                      <p className="body-text-muted">
                        {registrations.length === 0
                          ? 'No registrations yet for this tournament.'
                          : 'No registrations match your search.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRegs.map((reg) => (
                  <tr key={reg.id} className="table-row">
                    {/* Team / Player */}
                    <td className="table-cell">
                      <p className="table-cell-text font-medium">
                        {reg.team_name ?? reg.contact_name ?? '—'}
                      </p>
                      {reg.team_name && reg.contact_name && (
                        <p className="text-xs text-muted-foreground">{reg.contact_name}</p>
                      )}
                    </td>
                    {/* Contact */}
                    <td className="table-cell">
                      {reg.contact_email && (
                        <p className="text-xs text-muted-foreground">{reg.contact_email}</p>
                      )}
                      {reg.contact_phone && (
                        <p className="text-xs text-muted-foreground">{reg.contact_phone}</p>
                      )}
                      {!reg.contact_email && !reg.contact_phone && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    {/* Registered */}
                    <td className="table-cell body-text-muted text-sm">
                      {fmtShort(reg.created_at)}
                    </td>
                    {/* Status */}
                    <td className="table-cell">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${REG_BADGE[reg.status]}`}>
                        {REG_ICON[reg.status]}
                        {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                      </span>
                    </td>
                    {/* Payment */}
                    <td className="table-cell">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAY_BADGE[reg.payment_status]}`}>
                        {reg.payment_status.charAt(0).toUpperCase() + reg.payment_status.slice(1)}
                      </span>
                    </td>
                    {/* Waiver */}
                    <td className="table-cell text-center">
                      {reg.waiver_signed
                        ? <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                        : <XCircle     className="w-4 h-4 text-red-400/50 mx-auto"   />
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
    </DashboardLayout>
  );
}
