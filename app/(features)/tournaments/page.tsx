'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, MoreHorizontal, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEventsToken } from '@/hooks/useEventsToken';
import { jwtDecode } from "jwt-decode"
import { listEvents, EventItem, EventStatus } from '@/lib/event-api';
import { DashboardLayout } from '@/app/(layout)/dashboard-layout';

// TODO: swap with your real auth context


const PER_PAGE  = 5;

const STATUS_BADGE: Record<EventStatus, string> = {
  draft:      'bg-gray-500/20 text-gray-400',
  published:  'bg-blue-500/20 text-blue-400',
  ongoing:    'bg-green-500/20 text-green-400',
  completed:  'bg-purple-500/20 text-purple-400',
  canceled:   'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<EventStatus, string> = {
  draft:      'Draft',
  published:  'Published',
  ongoing:    'Live',
  completed:  'Completed',
  canceled:   'Canceled',
};

const ALL_STATUSES: EventStatus[] = ['draft', 'published', 'ongoing', 'completed', 'canceled'];

export default function TournamentsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<number | null>(null)
  const { token, loading: tokenLoading, error: tokenError, refresh } = useEventsToken(vendorId);

  const [events,       setEvents]       = useState<EventItem[]>([]);
  const [loadingData,  setLoadingData]  = useState(false);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page,         setPage]         = useState(1);
  const [openMenuId,   setOpenMenuId]   = useState<string | null>(null);
  
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

  useEffect(() => {
    if (!token) return;
    setLoadingData(true);
    listEvents(token, statusFilter || undefined)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [token, statusFilter]);

  const filtered   = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* ── Guards ──────────────────────────────────────── */
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
        <button className="btn-primary w-full justify-center" onClick={refresh}>Retry</button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
    <div className="page-container" onClick={() => setOpenMenuId(null)}>

      {/* ── Header ───────────────────────────────────── */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Tournaments</h1>
          <p className="page-subtitle">Manage all ongoing, upcoming, and completed tournaments.</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => router.push('/tournaments/create')}>
            <Plus className="icon-md" /> Create Tournament
          </button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-md text-muted-foreground" />
          <input
            className="input-field pl-10"
            placeholder="Search tournaments..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="select-field w-full sm:w-44"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* ── Table ────────────────────────────────────── */}
      <div className="table-container flex-1 overflow-auto">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              <th className="table-cell table-header-text text-left">Tournament Name</th>
              <th className="table-cell table-header-text text-left">Start Date</th>
              <th className="table-cell table-header-text text-left">End Date</th>
              <th className="table-cell table-header-text text-left">Status</th>
              <th className="table-cell table-header-text text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingData ? (
              [...Array(PER_PAGE)].map((_, i) => (
                <tr key={i} className="table-row animate-pulse">
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="table-cell">
                      <div className="h-4 bg-muted rounded w-full max-w-[180px]" />
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
                      {search || statusFilter ? 'No tournaments match your filters.' : 'No tournaments yet.'}
                    </p>
                    {!search && !statusFilter && (
                      <button className="btn-primary" onClick={() => router.push('/tournaments/create')}>
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
                  {/* Name */}
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="icon-blue p-2 rounded-lg">
                        <Trophy className="icon-md text-blue-400" />
                      </div>
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
                      {STATUS_LABELS[ev.status]}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="table-cell text-right relative">
                    <button
                      className="btn-icon"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === ev.id ? null : ev.id); }}
                    >
                      <MoreHorizontal className="icon-md" />
                    </button>
                    {openMenuId === ev.id && (
                      <div
                        className="absolute right-4 top-10 z-20 bg-card border border-border rounded-lg shadow-xl py-1 w-44"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                          onClick={() => router.push(`/tournaments/${ev.id}`)}
                        >
                          View Details
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
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

      {/* ── Pagination ───────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 flex-shrink-0">
          <p className="body-text-muted">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} results
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
                    ? 'bg-primary text-primary-foreground'
                    : 'btn-secondary'
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
    </DashboardLayout>
  );
}
