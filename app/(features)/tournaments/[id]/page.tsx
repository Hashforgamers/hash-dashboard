'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Home, Search, Trophy,
  Users, Download, CheckCircle2, XCircle,
  Clock, CreditCard, ImageIcon, Sparkles,
} from 'lucide-react';
import { useEventsToken } from '@/hooks/useEventsToken';
import {
  listEvents, getRegistrations,
  EventItem, Registration,
  EventStatus, RegistrationStatus, PaymentStatus,
  getTeams, TeamItem, publishResults, WinnerInput,
} from '@/lib/event-api';
import { jwtDecode } from 'jwt-decode';
import { DashboardLayout } from '@/app/(layout)/dashboard-layout';
import { useModuleCache } from '@/app/hooks/useModuleCache';
import { useDashboardData } from '@/app/context/DashboardDataContext';



// ─── Badge maps ───────────────────────────────────────────────────────────────
const EVENT_STATUS_BADGE: Record<EventStatus, string> = {
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
  paid:     'bg-green-500/20 text-green-400',
  pending:  'bg-yellow-500/20 text-yellow-400',
  failed:   'bg-red-500/20 text-red-400',
  refunded: 'bg-purple-500/20 text-purple-400',
};

const REG_ICON: Record<RegistrationStatus, React.ReactNode> = {
  confirmed: <CheckCircle2 className="w-3 h-3" />,
  pending:   <Clock        className="w-3 h-3" />,
  rejected:  <XCircle      className="w-3 h-3" />,
  canceled:  <XCircle      className="w-3 h-3" />,
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TournamentDetailPage() {
  const router  = useRouter();
  const params  = useParams();
  const eventId = params.id as string;
 const [vendorId, setVendorId] = useState<number | null>(null)
  const { vendorId: cachedVendorId } = useDashboardData();
  const { token, loading: tokenLoading } = useEventsToken(vendorId);

  const [event,         setEvent]         = useState<EventItem | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingEvent,  setLoadingEvent]  = useState(true);
  const [loadingRegs,   setLoadingRegs]   = useState(true);
  const [teams,         setTeams]         = useState<TeamItem[]>([]);
  const [loadingTeams,  setLoadingTeams]  = useState(true);
  const [search,        setSearch]        = useState('');
  const [regFilter,     setRegFilter]     = useState('');
  const [publishError,  setPublishError]  = useState<string | null>(null);
  const [publishing,    setPublishing]    = useState(false);
  const [winners,       setWinners]       = useState<WinnerInput[]>([
    { rank: 1, team_id: '', verified_snapshot: '' },
    { rank: 2, team_id: '', verified_snapshot: '' },
    { rank: 3, team_id: '', verified_snapshot: '' },
  ]);

  // Fetch event
        useEffect(() => {
      if (cachedVendorId) {
        setVendorId(cachedVendorId);
        return;
      }
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
    }, [cachedVendorId])

  const eventKey = vendorId ? `tournament:${vendorId}:${eventId}` : "tournament:0";
  const regsKey = `tournament_regs:${eventId}`;
  const teamsKey = `tournament_teams:${eventId}`;
  const versionKey = vendorId ? `tournaments:${vendorId}` : "tournaments:0";

  const { data: cachedEvent, refresh: refreshEventCache } = useModuleCache<EventItem | null>(
    eventKey,
    async () => {
      if (!token) return null;
      const evs = await listEvents(token);
      return evs.find((e) => e.id === eventId) ?? null;
    },
    120000,
    versionKey
  );

  const { data: cachedRegs, refresh: refreshRegsCache } = useModuleCache<Registration[]>(
    regsKey,
    async () => {
      if (!token) return [];
      return getRegistrations(token, eventId);
    },
    120000,
    versionKey
  );

  const { data: cachedTeams, refresh: refreshTeamsCache } = useModuleCache<TeamItem[]>(
    teamsKey,
    async () => {
      if (!token) return [];
      return getTeams(token, eventId);
    },
    120000,
    versionKey
  );
  useEffect(() => {
    if (!token) return;
    if (cachedEvent) {
      setEvent(cachedEvent);
      setLoadingEvent(false);
      return;
    }
    refreshEventCache(true)
      .then((ev) => setEvent(ev ?? null))
      .catch(console.error)
      .finally(() => setLoadingEvent(false));
  }, [token, eventId, cachedEvent, refreshEventCache]);

  // Fetch registrations
  useEffect(() => {
    if (!token) return;
    if (cachedRegs) {
      setRegistrations(cachedRegs);
      setLoadingRegs(false);
      return;
    }
    refreshRegsCache(true)
      .then((data) => setRegistrations(data || []))
      .catch(console.error)
      .finally(() => setLoadingRegs(false));
  }, [token, eventId, cachedRegs, refreshRegsCache]);

  // Fetch teams
  useEffect(() => {
    if (!token) return;
    if (cachedTeams) {
      setTeams(cachedTeams);
      setLoadingTeams(false);
      return;
    }
    setLoadingTeams(true);
    refreshTeamsCache(true)
      .then((data) => setTeams(data || []))
      .catch(console.error)
      .finally(() => setLoadingTeams(false));
  }, [token, eventId, cachedTeams, refreshTeamsCache]);

  // Helpers
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });

  const fmtShort = (iso: string) =>
    new Date(iso).toLocaleDateString('en-CA'); // YYYY-MM-DD

  const filteredRegs = registrations.filter((r) => {
    const name        = (r.team_name ?? r.contact_name ?? '').toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchStatus = regFilter ? r.status === regFilter : true;
    return matchSearch && matchStatus;
  });

  // Stats
  const confirmed = registrations.filter((r) => r.status === 'confirmed').length;
  const pending   = registrations.filter((r) => r.status === 'pending').length;
  const paid      = registrations.filter((r) => r.payment_status === 'paid').length;

  const handleWinnerChange = (index: number, patch: Partial<WinnerInput>) => {
    setWinners((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handlePublishResults = async () => {
    if (!token) return;
    setPublishError(null);

    const selected = winners
      .map((w) => ({
        ...w,
        team_id: String(w.team_id || '').trim(),
        verified_snapshot: String(w.verified_snapshot || '').trim(),
      }))
      .filter((w) => w.team_id);

    if (selected.length === 0) {
      setPublishError('Select at least one winner to publish.');
      return;
    }

    const teamIds = selected.map((w) => w.team_id);
    const dupes = teamIds.filter((id, idx) => teamIds.indexOf(id) !== idx);
    if (dupes.length > 0) {
      setPublishError('A team can only appear once in winners.');
      return;
    }

    const payload = selected.map((w) => ({
      team_id: w.team_id,
      rank: Number(w.rank),
      verified_snapshot: w.verified_snapshot || undefined,
    }));

    try {
      setPublishing(true);
      await publishResults(token, eventId, payload);
      setEvent((prev) => prev ? { ...prev, status: 'completed' } : prev);
    } catch (error: any) {
      setPublishError(error?.message || 'Failed to publish results.');
    } finally {
      setPublishing(false);
    }
  };

  // CSV export
  const exportCSV = () => {
    const headers = [
      'Team/Player','Contact','Email','Phone',
      'Registered','Status','Payment','Waiver',
    ];
    const rows = registrations.map((r) => [
      r.team_name ?? r.contact_name ?? r.team_id,
      r.contact_name  ?? '',
      r.contact_email ?? '',
      r.contact_phone ?? '',
      fmtShort(r.created_at),
      r.status,
      r.payment_status,
      r.waiver_signed ? 'Yes' : 'No',
    ]);
    const csv  = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `registrations-${eventId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Guards ────────────────────────────────────────
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
        <button
          className="btn-primary"
          onClick={() => router.push('/tournaments')}
        >
          Back to Tournaments
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
    <div className="flex-1 space-y-3 overflow-y-auto sm:space-y-4">

      {/* ── Page Header ───────────────────────────────── */}
      <div className="gaming-panel rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
          <h1 className="premium-heading flex items-center gap-2">
            {event.title}
            <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
          </h1>
          <p className="premium-subtle mt-1">
            Manage tournament details, participants, and registrations.
          </p>
        </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-all duration-200 hover:border-cyan-300/45 hover:bg-slate-800/80 hover:text-cyan-100 sm:px-4 sm:text-sm" onClick={exportCSV}>
            <Download className="icon-sm" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Breadcrumb ────────────────────────────────── */}
      <nav className="gaming-panel flex flex-wrap items-center gap-2 rounded-xl p-3 text-xs text-slate-300/70 sm:text-sm">
        <button
          onClick={() => router.push('/')}
          className="hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          <Home className="icon-xs" /> Home
        </button>
        <span className="text-slate-500">|</span>
        <button
          onClick={() => router.push('/tournaments')}
          className="hover:text-foreground transition-colors"
        >
          Tournaments
        </button>
        <span className="text-slate-500">|</span>
        <span className="text-foreground truncate max-w-[260px]">{event.title}</span>
      </nav>

      {/* ── Tournament Details Card ───────────────────── */}
      <div className="gaming-panel content-card-padding mb-4 flex-shrink-0 rounded-xl border-cyan-400/20 bg-slate-950/45">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Banner / thumbnail */}
          <div className="w-full md:w-52 h-32 rounded-xl flex-shrink-0 overflow-hidden border border-cyan-400/20 bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center">
            {event.banner_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.banner_image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                <ImageIcon className="w-8 h-8" />
                <span className="text-xs">No banner</span>
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Tournament Details</h2>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full
                  ${EVENT_STATUS_BADGE[event.status]}`}
              >
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
                <p className="body-text-muted mb-1">Registrations</p>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4 flex-shrink-0">
        {[
          { label: 'Total',     value: registrations.length, color: 'icon-blue',    icon: <Users        className="icon-md text-blue-400"    /> },
          { label: 'Confirmed', value: confirmed,            color: 'icon-green',   icon: <CheckCircle2 className="icon-md text-green-400"   /> },
          { label: 'Pending',   value: pending,              color: 'icon-yellow',  icon: <Clock        className="icon-md text-yellow-400"  /> },
          { label: 'Paid',      value: paid,                 color: 'icon-emerald', icon: <CreditCard   className="icon-md text-emerald-400" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="gaming-kpi-card rounded-xl border border-cyan-400/20 bg-gradient-to-br from-slate-900/75 via-slate-900/65 to-cyan-950/20 p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-300/70">{label}</p>
                <p className="mt-1 text-xl font-bold text-cyan-100 sm:text-2xl">{value}</p>
              </div>
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>{icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Registrations Table ───────────────────────── */}
      <div className="gaming-panel flex flex-col overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950/45">
        {/* Table toolbar */}
        <div className="dashboard-toolbar justify-between gap-3 p-4 border-b border-cyan-500/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="icon-md text-muted-foreground" />
            <h3 className="section-title">Registrations</h3>
            {!loadingRegs && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {filteredRegs.length}
              </span>
            )}
          </div>
          <div className="dashboard-action-bar">
            <div className="relative min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-sm text-muted-foreground" />
              <input
                className="dashboard-module-input h-9 w-full pl-9 pr-3"
                placeholder="Search teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="dashboard-module-input h-9 w-36 px-3"
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
        <div className="dashboard-table-shell flex-1">
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
            <thead className="sticky top-0 bg-slate-900/70">
              <tr>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Team / Player</th>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Contact</th>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Registered</th>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Status</th>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Payment</th>
                <th className="table-cell text-center text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Waiver</th>
              </tr>
            </thead>
            <tbody>
              {loadingRegs ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="table-row animate-pulse">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="h-4 w-full max-w-[120px] rounded bg-slate-800/80" />
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
                          : 'No registrations match your filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRegs.map((reg) => (
                  <tr key={reg.id} className="table-row border-b border-cyan-500/10 last:border-0 hover:bg-cyan-500/5">
                    {/* Team / Player */}
                    <td className="table-cell">
                      <p className="table-cell-text font-medium">
                        {reg.team_name ?? reg.contact_name ?? '—'}
                      </p>
                      {reg.team_name && reg.contact_name && (
                        <p className="text-xs text-muted-foreground">
                          {reg.contact_name}
                        </p>
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
                    {/* Registered date */}
                    <td className="table-cell body-text-muted text-sm">
                      {fmtShort(reg.created_at)}
                    </td>
                    {/* Registration status */}
                    <td className="table-cell">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold
                          px-2.5 py-1 rounded-full ${REG_BADGE[reg.status]}`}
                      >
                        {REG_ICON[reg.status]}
                        {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                      </span>
                    </td>
                    {/* Payment status */}
                    <td className="table-cell">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full
                          ${PAY_BADGE[reg.payment_status]}`}
                      >
                        {reg.payment_status.charAt(0).toUpperCase() +
                          reg.payment_status.slice(1)}
                      </span>
                    </td>
                    {/* Waiver */}
                    <td className="table-cell text-center">
                      {reg.waiver_signed
                        ? <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                        : <XCircle      className="w-4 h-4 text-red-400/50 mx-auto"  />
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

      {/* ── Teams ─────────────────────────────────────── */}
      <div className="gaming-panel flex flex-col overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950/45">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Trophy className="icon-md text-muted-foreground" />
            <h3 className="section-title">Teams</h3>
            {!loadingTeams && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {teams.length}
              </span>
            )}
          </div>
        </div>
        <div className="dashboard-table-wrap flex-1">
          <table className="dashboard-table">
            <thead className="sticky top-0 bg-slate-900/70">
              <tr>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Team</th>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Type</th>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Members</th>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Created</th>
              </tr>
            </thead>
            <tbody>
              {loadingTeams ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="table-row animate-pulse">
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="h-4 w-full max-w-[140px] rounded bg-slate-800/80" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={4} className="table-cell text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-10 h-10 text-muted-foreground/20" />
                      <p className="body-text-muted">No teams yet for this tournament.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team.id} className="table-row border-b border-cyan-500/10 last:border-0 hover:bg-cyan-500/5">
                    <td className="table-cell">
                      <p className="table-cell-text font-medium">{team.name}</p>
                    </td>
                    <td className="table-cell body-text-muted text-sm">
                      {team.is_individual ? 'Solo' : 'Team'}
                    </td>
                    <td className="table-cell body-text-muted text-sm">
                      {typeof team.member_count === 'number' ? team.member_count : '—'}
                    </td>
                    <td className="table-cell body-text-muted text-sm">
                      {fmtShort(team.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Publish Results ───────────────────────────── */}
      <div className="gaming-panel rounded-xl border border-cyan-400/20 bg-slate-950/45 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="section-title">Publish Results</h3>
            <p className="premium-subtle text-sm">Select winners and publish final standings.</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${EVENT_STATUS_BADGE[event.status]}`}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
        </div>

        <div className="space-y-3">
          {winners.map((winner, idx) => (
            <div key={winner.rank} className="grid grid-cols-1 gap-3 rounded-lg border border-cyan-400/15 bg-slate-900/60 p-3 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-100">
                  #{winner.rank}
                </span>
                <span className="text-sm text-slate-200">Rank {winner.rank}</span>
              </div>
              <select
                className="h-10 w-full rounded-lg border border-cyan-400/25 bg-slate-900/70 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                value={winner.team_id}
                onChange={(e) => handleWinnerChange(idx, { team_id: e.target.value })}
              >
                <option value="">Select team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <input
                className="h-10 w-full rounded-lg border border-cyan-400/25 bg-slate-900/70 px-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                placeholder="Result image URL (optional)"
                value={winner.verified_snapshot || ''}
                onChange={(e) => handleWinnerChange(idx, { verified_snapshot: e.target.value })}
              />
            </div>
          ))}
        </div>

        {publishError && (
          <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {publishError}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-gradient-to-r from-cyan-500/90 to-emerald-500/90 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-900/40 transition-all duration-200 hover:from-cyan-400 hover:to-emerald-400 hover:shadow-lg hover:shadow-cyan-600/25 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
            onClick={handlePublishResults}
            disabled={publishing || teams.length === 0}
          >
            {publishing ? 'Publishing...' : 'Publish Results'}
          </button>
        </div>
      </div>

    </div>
    </DashboardLayout>
  );
}
