'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useEventsToken } from '@/hooks/useEventsToken';
import { createEvent, EventStatus } from '@/lib/event-api';
import { jwtDecode } from 'jwt-decode';
import { DashboardLayout } from '@/app/(layout)/dashboard-layout';

 // TODO: replace with auth context

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({
  selected,
  onSelect,
  minDate,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
  minDate?: Date;
}) {
  const today = new Date();
  const [view, setView] = useState(selected ?? today);
  const year     = view.getFullYear();
  const month    = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          className="btn-icon"
          onClick={() => setView(new Date(year, month - 1, 1))}
        >
          <ChevronLeft className="icon-sm" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {view.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button
          className="btn-icon"
          onClick={() => setView(new Date(year, month + 1, 1))}
        >
          <ChevronRight className="icon-sm" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-xs text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day  = i + 1;
          const date = new Date(year, month, day);
          const isSel    = selected?.toDateString() === date.toDateString();
          const disabled = minDate ? date < minDate : false;
          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => onSelect(date)}
              className={`w-8 h-8 mx-auto rounded-full text-sm transition-colors
                ${isSel ? 'bg-primary text-primary-foreground font-bold' : ''}
                ${!isSel && !disabled ? 'hover:bg-muted text-foreground' : ''}
                ${disabled ? 'text-muted-foreground/30 cursor-not-allowed' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type DateTarget = 'start' | 'end' | 'deadline';

interface FormState {
  title: string;
  description: string;
  status: EventStatus;
  registration_fee: string;
  currency: string;
  capacity_team: string;
  capacity_player: string;
  min_team_size: number;
  max_team_size: number;
  allow_solo: boolean;
  allow_individual: boolean;
  visibility: boolean;
}

export default function CreateTournamentPage() {
  const router = useRouter();
   const [vendorId, setVendorId] = useState<number | null>(null)
  const { token, loading: tokenLoading } = useEventsToken(vendorId);

  const [form, setForm] = useState<FormState>({
    title:            '',
    description:      '',
    status:           'draft',
    registration_fee: '0',
    currency:         'INR',
    capacity_team:    '',
    capacity_player:  '',
    min_team_size:    5,
    max_team_size:    5,
    allow_solo:       false,
    allow_individual: false,
    visibility:       true,
  });

  const [startDate,    setStartDate]    = useState<Date | null>(null);
  const [endDate,      setEndDate]      = useState<Date | null>(null);
  const [deadline,     setDeadline]     = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<DateTarget>('start');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');


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

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleDateSelect = (d: Date) => {
    if (activePicker === 'start') {
      setStartDate(d);
      setActivePicker('end');
    } else if (activePicker === 'end') {
      setEndDate(d);
      setActivePicker('deadline');
    } else {
      setDeadline(d);
    }
  };

  const getPickerDate = () => {
    if (activePicker === 'start')    return startDate;
    if (activePicker === 'end')      return endDate;
    return deadline;
  };

  const handleSubmit = async () => {
    if (!token)             return setError('Session not ready, please wait a moment.');
    if (!form.title.trim()) return setError('Tournament name is required.');
    if (!startDate)         return setError('Start date is required.');
    if (!endDate)           return setError('End date is required.');
    if (endDate < startDate) return setError('End date must be after start date.');
    if (deadline && deadline >= startDate) return setError('Registration deadline must be before start date.');
    if (form.min_team_size > form.max_team_size) return setError('Min team size cannot exceed max team size.');

    setSubmitting(true);
    setError('');

    try {
      // Build ISO strings at midnight UTC
      const toISO = (d: Date) => d.toISOString();

      const ev = await createEvent(token, {
        title:                 form.title.trim(),
        description:           form.description.trim() || undefined,
        start_at:              toISO(startDate),
        end_at:                toISO(endDate),
        registration_deadline: deadline ? toISO(deadline) : undefined,
        registration_fee:      parseFloat(form.registration_fee) || 0,
        currency:              form.currency,
        capacity_team:         form.capacity_team    ? parseInt(form.capacity_team)    : undefined,
        capacity_player:       form.capacity_player  ? parseInt(form.capacity_player)  : undefined,
        min_team_size:         form.min_team_size,
        max_team_size:         form.max_team_size,
        allow_solo:            form.allow_solo,
        allow_individual:      form.allow_individual,
        visibility:            form.visibility,
        status:                form.status,
      });

      router.push(`/tournaments/${ev.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const datePickerLabel: Record<DateTarget, string> = {
    start:    'Start Date',
    end:      'End Date',
    deadline: 'Registration Deadline',
  };

  return (
    <DashboardLayout>
    <div className="page-container overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full pb-10">

        {/* ── Header ───────────────────────────────────── */}
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Create New Tournament</h1>
            <p className="page-subtitle">Fill in the details below to set up your new eSports event.</p>
          </div>
        </div>

        <div className="space-y-10">

          {/* ── Basic Information ───────────────────────── */}
          <section>
            <h2 className="section-title mb-1">Basic Information</h2>
            <div className="h-px bg-border mb-5" />
            <div className="space-y-4">

              <div>
                <label className="form-label block">Tournament Name *</label>
                <input
                  className="input-field"
                  placeholder="e.g., Hash GTA Cup"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label block">Description</label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  placeholder="e.g., 5v5 GTA single-elim tournament"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>

              <div className="two-col-grid">
                <div>
                  <label className="form-label block">Publish Status</label>
                  <select
                    className="select-field"
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as EventStatus)}
                  >
                    <option value="draft">Save as Draft</option>
                    <option value="published">Publish Immediately</option>
                  </select>
                </div>
                <div>
                  <label className="form-label block">Currency</label>
                  <select
                    className="select-field"
                    value={form.currency}
                    onChange={(e) => set('currency', e.target.value)}
                  >
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
              </div>

            </div>
          </section>

          {/* ── Schedule ─────────────────────────────────── */}
          <section>
            <h2 className="section-title mb-1">Schedule & Logistics</h2>
            <div className="h-px bg-border mb-5" />

            {/* Date picker toggle */}
            <label className="form-label block mb-3">Tournament Dates *</label>
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['start', 'end', 'deadline'] as DateTarget[]).map((t) => {
                const dateMap = { start: startDate, end: endDate, deadline: deadline };
                return (
                  <button
                    key={t}
                    onClick={() => setActivePicker(t)}
                    className={`flex items-center gap-2 btn-secondary text-xs py-2 px-3
                      ${activePicker === t ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    <CalendarDays className="icon-xs" />
                    {datePickerLabel[t]}: {dateMap[t] ? dateMap[t]!.toLocaleDateString() : '—'}
                  </button>
                );
              })}
            </div>

            <div className="two-col-grid items-start">
              <MiniCalendar
                selected={getPickerDate()}
                onSelect={handleDateSelect}
                minDate={activePicker === 'end' ? (startDate ?? undefined) : undefined}
              />

              <div className="space-y-4">
                <div>
                  <label className="form-label block">Max Teams</label>
                  <input
                    className="input-field"
                    type="number"
                    min={1}
                    placeholder="e.g., 32"
                    value={form.capacity_team}
                    onChange={(e) => set('capacity_team', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label block">Max Players</label>
                  <input
                    className="input-field"
                    type="number"
                    min={1}
                    placeholder="e.g., 160"
                    value={form.capacity_player}
                    onChange={(e) => set('capacity_player', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label block">Team Size Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      className="input-field"
                      type="number"
                      min={1}
                      placeholder="Min"
                      value={form.min_team_size}
                      onChange={(e) => set('min_team_size', parseInt(e.target.value) || 1)}
                    />
                    <span className="text-muted-foreground font-medium">–</span>
                    <input
                      className="input-field"
                      type="number"
                      min={1}
                      placeholder="Max"
                      value={form.max_team_size}
                      onChange={(e) => set('max_team_size', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  {[
                    { key: 'allow_solo'       as const, label: 'Allow Solo Players'           },
                    { key: 'allow_individual' as const, label: 'Allow Individual Registration' },
                    { key: 'visibility'       as const, label: 'Visible to Public'             },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[key] as boolean}
                        onChange={(e) => set(key, e.target.checked)}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="body-text">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Financials ───────────────────────────────── */}
          <section>
            <h2 className="section-title mb-1">Financials</h2>
            <div className="h-px bg-border mb-5" />
            <div className="two-col-grid">
              <div>
                <label className="form-label block">Entry / Registration Fee ({form.currency})</label>
                <input
                  className="input-field"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g., 10"
                  value={form.registration_fee}
                  onChange={(e) => set('registration_fee', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label block">Prize Pool ({form.currency}) <span className="text-muted-foreground font-normal text-xs">(display only)</span></label>
                <input
                  className="input-field"
                  type="number"
                  min={0}
                  placeholder="e.g., 1000"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">Prize pool is managed separately.</p>
              </div>
            </div>
          </section>

          {/* ── Error ──────────────────────────────────── */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* ── Actions ────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn-secondary"
              onClick={() => router.push('/tournaments')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="btn-primary min-w-[10rem] justify-center"
              onClick={handleSubmit}
              disabled={submitting || tokenLoading}
            >
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                : form.status === 'published' ? 'Publish Tournament' : 'Save as Draft'
              }
            </button>
          </div>

        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
