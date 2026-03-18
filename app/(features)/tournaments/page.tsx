'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, MoreHorizontal, Trophy,
  ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react';
import { useEventsToken } from '@/hooks/useEventsToken';
import { jwtDecode } from "jwt-decode"
import { listEvents, EventItem, EventStatus } from '@/lib/event-api';
import { DashboardLayout } from '@/app/(layout)/dashboard-layout';
import { useModuleCache } from '@/app/hooks/useModuleCache';
import { useDashboardData } from '@/app/context/DashboardDataContext';

// TODO: swap with your real auth context


const PER_PAGE  = 5;

const STATUS_BADGE: Record<EventStatus, string> = {
  draft:     'bg-gray-500/20 text-gray-400',
  published: 'bg-blue-500/20 text-blue-400',
  ongoing:   'bg-green-500/20 text-green-400',
  completed: 'bg-purple-500/20 text-purple-400',
  canceled:  'bg-red-500/20 text-red-400',
};

const STATUS_LABEL: Record<EventStatus, string> = {
  draft:     'Draft',
  published: 'Published',
  ongoing:   'Live',
  completed: 'Completed',
  canceled:  'Canceled',
};

const ALL_STATUSES: EventStatus[] = [
  'draft', 'published', 'ongoing', 'completed', 'canceled',
];

export default function TournamentsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<number | null>(null)
  const { vendorId: cachedVendorId } = useDashboardData();
  const { token, loading: tokenLoading, error: tokenError, refresh } = useEventsToken(vendorId);

  const [events,       setEvents]       = useState<EventItem[]>([]);
  const [loadingData,  setLoadingData]  = useState(false);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page,         setPage]         = useState(1);
  const [openMenuId,   setOpenMenuId]   = useState<string | null>(null);
  
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

  const cacheKey = vendorId ? `tournaments:${vendorId}:${statusFilter || "all"}` : "tournaments:0";
  const versionKey = vendorId ? `tournaments:${vendorId}` : "tournaments:0";
  const { data: cachedEvents, refresh: refreshEventsCache } = useModuleCache<EventItem[]>(
    cacheKey,
    async () => {
      if (!token) return [];
      return listEvents(token, statusFilter || undefined);
    },
    120000,
    versionKey
  );

  useEffect(() => {
    if (!token) return;
    if (cachedEvents) {
      setEvents(cachedEvents);
      return;
    }
    setLoadingData(true);
    refreshEventsCache(true)
      .then((data) => setEvents(data || []))
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [token, statusFilter, cachedEvents, refreshEventsCache]);

  const filtered   = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Guards ────────────────────────────────────────────
  if (tokenLoading) return (
    <div className="page-container items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="body-text-muted">Initializing session...</p>
      </div>
    </div>
  );

  if (tokenError) return (
    <div className="page-container items-center justify-center">
      <div className="content-card content-card-padding text-center max-w-sm w-full">
        <p className="text-red-400 mb-4 body-text">{tokenError}</p>
        <button className="btn-primary w-full justify-center" onClick={refresh}>
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout contentScroll="contained">
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 sm:gap-4" onClick={() => setOpenMenuId(null)}>

      <div className="gaming-panel shrink-0 rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="premium-heading flex items-center gap-2">
              Tournament Command
              <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
            </h1>
            <p className="premium-subtle mt-1">
              Manage all ongoing, upcoming, and completed tournaments.
            </p>
          </div>
          <button
            className="dashboard-btn-primary inline-flex items-center justify-center gap-2 px-3 py-2 text-xs sm:px-4 sm:text-sm"
            onClick={() => router.push('/tournaments/create')}
          >
            <Plus className="icon-md" /> Create Tournament
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3 sm:space-y-4">
        {/* ── Filters ──────────────────────────────────── */}
        <div className="gaming-panel dashboard-toolbar mb-2 rounded-xl p-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
            <input
              className="dashboard-module-input h-10 w-full pl-10 pr-4"
              placeholder="Search tournaments..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="dashboard-module-input h-10 w-full sm:w-44"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        {/* ── Table ────────────────────────────────────── */}
        <div className="dashboard-table-shell">
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Tournament</th>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Start Date</th>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">End Date</th>
                <th className="table-cell text-left text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Status</th>
                <th className="table-cell text-right text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                [...Array(PER_PAGE)].map((_, i) => (
                  <tr key={i} className="table-row animate-pulse">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="h-4 w-full max-w-[180px] rounded bg-slate-800/80" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <Trophy className="w-10 h-10 text-muted-foreground/30" />
                      <p className="body-text-muted">
                        {search || statusFilter
                          ? 'No tournaments match your filters.'
                          : 'No tournaments yet.'}
                      </p>
                      {!search && !statusFilter && (
                        <button
                          className="btn-primary"
                          onClick={() => router.push('/tournaments/create')}
                        >
                          <Plus className="icon-sm" /> Create your first one
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((ev) => (
                  <tr
                    key={ev.id}
                    className="table-row cursor-pointer"
                    onClick={() => router.push(`/tournaments/${ev.id}`)}
                  >
                    {/* Tournament name + banner thumbnail */}
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {ev.banner_image_url ? (
                          <img
                            src={ev.banner_image_url}
                            alt={ev.title}
                            className="h-10 w-10 flex-shrink-0 rounded-lg border border-cyan-400/20 object-cover"
                          />
                        ) : (
                          <div className="icon-blue flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                            <Trophy className="icon-md text-blue-400" />
                          </div>
                        )}
                        <span className="table-cell-text font-medium">{ev.title}</span>
                      </div>
                    </td>
                    {/* Start */}
                    <td className="table-cell body-text-muted">
                      {new Date(ev.start_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>
                    {/* End */}
                    <td className="table-cell body-text-muted">
                      {new Date(ev.end_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>
                    {/* Status */}
                    <td className="table-cell">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_BADGE[ev.status]}`}>
                        {STATUS_LABEL[ev.status]}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="table-cell text-right relative">
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === ev.id ? null : ev.id);
                        }}
                      >
                        <MoreHorizontal className="icon-md" />
                      </button>
                      {openMenuId === ev.id && (
                        <div
                          className="absolute right-4 top-10 z-20 w-44 rounded-lg border border-cyan-400/20 bg-slate-900/95 py-1 shadow-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-slate-100 transition-colors hover:bg-slate-800"
                            onClick={() => router.push(`/tournaments/${ev.id}`)}
                          >
                            View Details
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-slate-100 transition-colors hover:bg-slate-800"
                            onClick={() => router.push(`/tournaments/${ev.id}?tab=registrations`)}
                          >
                            View Registrations
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ───────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 flex-shrink-0">
            <p className="body-text-muted">
              Showing {(page - 1) * PER_PAGE + 1}–
              {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} results
            </p>
            <div className="flex items-center gap-1">
              <button
                className="btn-icon disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="icon-md" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    page === n
                      ? 'bg-cyan-500 text-white'
                      : 'border border-cyan-400/20 bg-slate-900/70 text-slate-200 hover:border-cyan-300/45 hover:bg-slate-800/80'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                className="btn-icon disabled:opacity-40"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="icon-md" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}
