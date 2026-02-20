'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, CalendarDays,
  Upload, X, ImageIcon,
} from 'lucide-react';
import { useEventsToken } from '@/hooks/useEventsToken';
import { createEvent, uploadEventBanner, deleteEventBanner, EventStatus, } from '@/lib/event-api';
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
  const [view, setView] = useState(selected ?? new Date());
  const year        = view.getFullYear();
  const month       = view.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
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
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day      = i + 1;
          const date     = new Date(year, month, day);
          const isSel    = selected?.toDateString() === date.toDateString();
          const disabled = minDate
            ? date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
            : false;
          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => onSelect(date)}
              className={`w-8 h-8 mx-auto rounded-full text-sm transition-colors
                ${isSel    ? 'bg-primary text-primary-foreground font-bold' : ''}
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

// ─── Banner Uploader ──────────────────────────────────────────────────────────
function BannerUploader({
  preview,
  uploading,
  onFileSelect,
  onRemove,
}: {
  preview: string | null;
  uploading: boolean;
  onFileSelect: (f: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) onFileSelect(file);
  };

  return (
    <div className="space-y-2">
      <label className="form-label block">Event Banner</label>
      <p className="text-xs text-muted-foreground mb-3">
        Recommended: 1200×630px — PNG, JPG or WEBP. Stored on Cloudinary.
      </p>

      {preview ? (
        /* ── Preview with hover controls ── */
        <div
          className="relative w-full rounded-xl overflow-hidden border border-border group"
          style={{ aspectRatio: '1200/630' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Banner preview"
            className="w-full h-full object-cover"
          />
          {/* Hover overlay */}
          {!uploading && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="icon-xs" /> Change Image
              </button>
              <button
                type="button"
                className="btn-danger text-xs"
                onClick={onRemove}
              >
                <X className="icon-xs" /> Remove
              </button>
            </div>
          )}
          {/* Uploading overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-xs font-medium">Uploading to Cloudinary...</p>
            </div>
          )}
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          className={`w-full rounded-xl border-2 border-dashed transition-all cursor-pointer
            flex flex-col items-center justify-center gap-3 py-16
            ${uploading
              ? 'border-primary/40 bg-primary/5 cursor-not-allowed'
              : 'border-border hover:border-primary/50 hover:bg-primary/5'
            }`}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="body-text-muted text-sm">Uploading...</p>
            </>
          ) : (
            <>
              <div className="icon-blue p-4 rounded-2xl">
                <ImageIcon className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="body-text font-medium">Click to upload or drag & drop</p>
                <p className="body-text-muted text-xs mt-1">PNG, JPG, WEBP — max 10MB</p>
              </div>
              <button
                type="button"
                className="btn-secondary text-sm pointer-events-none"
              >
                <Upload className="icon-sm" /> Browse Files
              </button>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ─── Create Page ──────────────────────────────────────────────────────────────
type DateTarget = 'start' | 'end' | 'deadline';

interface FormState {
  title: string;
  description: string;
  status: EventStatus;
  currency: string;
  registration_fee: string;
  capacity_team: string;
  capacity_player: string;
  min_team_size: number;
  max_team_size: number;
  allow_solo: boolean;
  allow_individual: boolean;
  visibility: boolean;
}

const DATE_LABEL: Record<DateTarget, string> = {
  start:    'Start Date',
  end:      'End Date',
  deadline: 'Reg. Deadline',
};

export default function CreateTournamentPage() {
  const router = useRouter();
   const [vendorId, setVendorId] = useState<number | null>(null)
  const { token, loading: tokenLoading } = useEventsToken(vendorId);

  const [form, setForm] = useState<FormState>({
    title:            '',
    description:      '',
    status:           'draft',
    currency:         'INR',
    registration_fee: '0',
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

  // Banner state
  const [bannerFile,      setBannerFile]      = useState<File | null>(null);
  const [bannerPreview,   setBannerPreview]   = useState<string | null>(null);
  const [bannerPublicId,  setBannerPublicId]  = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

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

  // ── Banner handlers ───────────────────────────────
  const handleBannerSelect = (file: File) => {
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setBannerPublicId(null);
  };

  const handleBannerRemove = async () => {
    if (bannerPublicId && token) {
      await deleteEventBanner(token, bannerPublicId).catch(console.error);
    }
    setBannerFile(null);
    setBannerPreview(null);
    setBannerPublicId(null);
  };

  // ── Calendar handler ──────────────────────────────
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

  const dateValueMap: Record<DateTarget, Date | null> = {
    start:    startDate,
    end:      endDate,
    deadline: deadline,
  };

  // ── Validation + Submit ───────────────────────────
  const handleSubmit = async () => {
    if (!token)                          return setError('Session not ready. Please wait a moment.');
    if (!form.title.trim())              return setError('Tournament name is required.');
    if (!startDate)                      return setError('Start date is required.');
    if (!endDate)                        return setError('End date is required.');
    if (endDate < startDate)             return setError('End date must be after start date.');
    if (form.min_team_size > form.max_team_size) return setError('Min team size cannot exceed max team size.');
    if (deadline && deadline >= startDate) return setError('Registration deadline must be before start date.');

    setSubmitting(true);
    setError('');

    try {
      // Step 1 — upload banner if selected
      let banner_image_url: string | undefined;
      let banner_public_id: string | undefined;

      if (bannerFile) {
        setBannerUploading(true);
        const uploadResult = await uploadEventBanner(token, bannerFile, form.title.trim());
        setBannerUploading(false);
        banner_image_url = uploadResult.url;
        banner_public_id = uploadResult.public_id;
        setBannerPublicId(uploadResult.public_id);
      }

      // Step 2 — create event
      const ev = await createEvent(token, {
        title:                 form.title.trim(),
        description:           form.description.trim() || undefined,
        start_at:              startDate.toISOString(),
        end_at:                endDate.toISOString(),
        registration_deadline: deadline?.toISOString(),
        registration_fee:      parseFloat(form.registration_fee) || 0,
        currency:              form.currency,
        capacity_team:         form.capacity_team   ? parseInt(form.capacity_team)   : undefined,
        capacity_player:       form.capacity_player ? parseInt(form.capacity_player) : undefined,
        min_team_size:         form.min_team_size,
        max_team_size:         form.max_team_size,
        allow_solo:            form.allow_solo,
        allow_individual:      form.allow_individual,
        visibility:            form.visibility,
        status:                form.status,
        banner_image_url,
        banner_public_id,
      });

      router.push(`/tournaments/${ev.id}`);
    } catch (e) {
      setBannerUploading(false);
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting || bannerUploading;

  return (
    <DashboardLayout>
    <div className="page-container overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full pb-10">

        {/* ── Header ─────────────────────────────────── */}
        <div className="page-header">
          <div className="page-title-section">
            <h1 className="page-title">Create New Tournament</h1>
            <p className="page-subtitle">
              Fill in the details below to set up your new eSports event.
            </p>
          </div>
        </div>

        <div className="space-y-10">

          {/* ── 1. Event Banner ──────────────────────── */}
          <section>
            <h2 className="section-title mb-1">Event Banner</h2>
            <div className="h-px bg-border mb-5" />
            <BannerUploader
              preview={bannerPreview}
              uploading={bannerUploading}
              onFileSelect={handleBannerSelect}
              onRemove={handleBannerRemove}
            />
          </section>

          {/* ── 2. Basic Information ─────────────────── */}
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

          {/* ── 3. Schedule & Logistics ──────────────── */}
          <section>
            <h2 className="section-title mb-1">Schedule & Logistics</h2>
            <div className="h-px bg-border mb-5" />

            {/* Date picker tabs */}
            <label className="form-label block mb-3">Tournament Dates *</label>
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['start', 'end', 'deadline'] as DateTarget[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActivePicker(t)}
                  className={`flex items-center gap-2 btn-secondary text-xs py-2 px-3 transition-all
                    ${activePicker === t ? 'ring-2 ring-primary' : ''}
                  `}
                >
                  <CalendarDays className="icon-xs" />
                  {DATE_LABEL[t]}: {dateValueMap[t]
                    ? dateValueMap[t]!.toLocaleDateString()
                    : '—'}
                </button>
              ))}
            </div>

            <div className="two-col-grid items-start">
              {/* Calendar */}
              <MiniCalendar
                selected={dateValueMap[activePicker]}
                onSelect={handleDateSelect}
                minDate={activePicker === 'end' ? (startDate ?? undefined) : undefined}
              />

              {/* Right side inputs */}
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
                      onChange={(e) =>
                        set('min_team_size', parseInt(e.target.value) || 1)
                      }
                    />
                    <span className="text-muted-foreground font-medium">–</span>
                    <input
                      className="input-field"
                      type="number"
                      min={1}
                      placeholder="Max"
                      value={form.max_team_size}
                      onChange={(e) =>
                        set('max_team_size', parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  {([
                    { key: 'allow_solo'       as const, label: 'Allow Solo Players'            },
                    { key: 'allow_individual' as const, label: 'Allow Individual Registration' },
                    { key: 'visibility'       as const, label: 'Visible to Public'             },
                  ]).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
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

          {/* ── 4. Financials ────────────────────────── */}
          <section>
            <h2 className="section-title mb-1">Financials</h2>
            <div className="h-px bg-border mb-5" />
            <div className="two-col-grid">
              <div>
                <label className="form-label block">
                  Entry / Registration Fee ({form.currency})
                </label>
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
                <label className="form-label block">
                  Prize Pool ({form.currency})
                  <span className="text-muted-foreground font-normal text-xs ml-2">
                    (display only)
                  </span>
                </label>
                <input
                  className="input-field opacity-50"
                  type="number"
                  min={0}
                  placeholder="e.g., 1000"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Prize pool is managed separately.
                </p>
              </div>
            </div>
          </section>

          {/* ── Error ────────────────────────────────── */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* ── Actions ──────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn-secondary"
              onClick={() => router.push('/tournaments')}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className="btn-primary min-w-[10rem] justify-center"
              onClick={handleSubmit}
              disabled={isLoading || tokenLoading}
            >
              {bannerUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading banner...
                </>
              ) : submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : form.status === 'published' ? (
                'Publish Tournament'
              ) : (
                'Save as Draft'
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
