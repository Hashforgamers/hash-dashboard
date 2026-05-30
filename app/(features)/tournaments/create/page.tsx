'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, CalendarDays,
  Upload, X, ImageIcon, Sparkles, Trophy,
  Gamepad2, MapPinned, ShieldCheck, Users,
  Clock, Banknote, RadioTower, ListChecks,
  Eye, EyeOff, Zap,
} from 'lucide-react';
import { useEventsToken } from '@/hooks/useEventsToken';
import { createEvent, uploadEventBanner, deleteEventBanner, EventStatus, TournamentFormat, VetoMode } from '@/lib/event-api';
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
    <div className="dashboard-module-panel rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          className="dashboard-btn-secondary inline-flex items-center justify-center rounded-md p-1.5"
          onClick={() => setView(new Date(year, month - 1, 1))}
        >
          <ChevronLeft className="icon-sm" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {view.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button
          className="dashboard-btn-secondary inline-flex items-center justify-center rounded-md p-1.5"
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
                ${isSel    ? 'bg-cyan-500 text-white font-bold' : ''}
                ${!isSel && !disabled ? 'hover:bg-slate-800 text-slate-100' : ''}
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
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-all duration-200 hover:border-cyan-300/45 hover:bg-slate-800/80 hover:text-cyan-100"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="icon-xs" /> Change Image
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition-all duration-200 hover:border-rose-300/60 hover:bg-rose-500/20"
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
            flex flex-col items-center justify-center gap-3 py-10
            ${uploading
              ? 'border-cyan-400/40 bg-cyan-500/5 cursor-not-allowed'
              : 'border-cyan-400/20 hover:border-cyan-300/45 hover:bg-cyan-500/5'
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
                className="pointer-events-none inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-200"
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
  game: string;
  format: TournamentFormat;
  prize_pool: string;
  team_size: number;
  match_rules: string;
  region: string;
  server: string;
  map_pool: string;
  veto_mode: VetoMode;
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

type TournamentPreset = {
  id: string;
  label: string;
  description: string;
  patch: Partial<FormState>;
};

const TOURNAMENT_PRESETS: TournamentPreset[] = [
  {
    id: 'valorant_5v5',
    label: 'Valorant 5v5 Cup',
    description: 'Best fit for cafe LAN nights and tactical FPS events.',
    patch: {
      game: 'valorant',
      format: 'single_elimination',
      team_size: 5,
      min_team_size: 5,
      max_team_size: 5,
      capacity_team: '16',
      capacity_player: '80',
      region: 'India',
      server: 'Mumbai',
      map_pool: 'Bind, Haven, Split, Ascent, Icebox, Lotus, Sunset',
      veto_mode: 'bo1_ban_until_decider',
      match_rules: 'Custom lobby. Captains confirm lobby before start. Winner must upload scoreboard screenshot. Result mismatch creates an admin dispute.',
    },
  },
  {
    id: 'solo_showdown',
    label: 'Solo Showdown',
    description: 'Quick individual tournament for walk-ins and daily cafe traffic.',
    patch: {
      game: 'custom',
      format: 'single_elimination',
      team_size: 1,
      min_team_size: 1,
      max_team_size: 1,
      capacity_team: '32',
      capacity_player: '32',
      allow_solo: true,
      allow_individual: true,
      veto_mode: 'none',
      match_rules: 'Single player entry. Admin verifies results manually. No-show after 10 minutes may be forfeited.',
    },
  },
  {
    id: 'weekend_cafe_cup',
    label: 'Weekend Cafe Cup',
    description: 'Prize-backed local event with controlled team capacity.',
    patch: {
      game: 'valorant',
      format: 'single_elimination',
      team_size: 5,
      min_team_size: 5,
      max_team_size: 5,
      capacity_team: '8',
      capacity_player: '40',
      registration_fee: '500',
      prize_pool: '5000',
      region: 'India',
      server: 'Mumbai',
      veto_mode: 'bo1_ban_until_decider',
      match_rules: 'Teams must check in at cafe desk. Admin assigns systems. Captains submit result screenshot after every match.',
    },
  },
];

export default function CreateTournamentPage() {
  const router = useRouter();
   const [vendorId, setVendorId] = useState<number | null>(null)
  const { token, loading: tokenLoading } = useEventsToken(vendorId);

  const [form, setForm] = useState<FormState>({
    title:            '',
    description:      '',
    status:           'draft',
    currency:         'INR',
    game:             'valorant',
    format:           'single_elimination',
    prize_pool:       '0',
    team_size:        5,
    match_rules:      '',
    region:           'India',
    server:           'Mumbai',
    map_pool:         'Bind, Haven, Split, Ascent, Icebox, Lotus, Sunset',
    veto_mode:        'bo1_ban_until_decider',
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
  const applyPreset = (preset: TournamentPreset) => {
    setForm((current) => ({ ...current, ...preset.patch }));
  };
  const applyQuickDate = (daysFromToday: number) => {
    const start = new Date();
    start.setDate(start.getDate() + daysFromToday);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 0, 0, 0);
    const regDeadline = new Date(start);
    regDeadline.setHours(12, 0, 0, 0);
    setStartDate(start);
    setEndDate(end);
    setDeadline(regDeadline);
    setActivePicker('start');
  };
  const mapPoolCount = form.map_pool.split(',').map((m) => m.trim()).filter(Boolean).length;
  const maxTeams = parseInt(form.capacity_team) || 0;
  const maxPlayers = parseInt(form.capacity_player) || (maxTeams && form.team_size ? maxTeams * form.team_size : 0);
  const fee = parseFloat(form.registration_fee) || 0;
  const prize = parseFloat(form.prize_pool) || 0;
  const readyChecks = [
    { label: 'Name', ready: Boolean(form.title.trim()) },
    { label: 'Dates', ready: Boolean(startDate && endDate) },
    { label: 'Game', ready: Boolean(form.game && form.format) },
    { label: 'Capacity', ready: Boolean(maxTeams || maxPlayers) },
    { label: 'Rules', ready: Boolean(form.match_rules.trim()) },
  ];
  const completionCount = readyChecks.filter((item) => item.ready).length;
  const sectionPanelClass = "gaming-panel rounded-xl border border-cyan-400/20 bg-slate-950/45 p-4 sm:p-5";
  const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-cyan-100/80 sm:text-xs";
  const inputClass = "h-10 w-full rounded-lg border border-cyan-400/25 bg-slate-900/70 px-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60";
  const textareaClass = "w-full rounded-lg border border-cyan-400/25 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60";
  const selectClass = "h-10 w-full rounded-lg border border-cyan-400/25 bg-slate-900/70 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60";
  const primaryButtonClass = "dashboard-btn-primary inline-flex items-center justify-center gap-2 px-3 py-2 text-xs sm:px-4 sm:text-sm";
  const secondaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-all duration-200 hover:border-cyan-300/45 hover:bg-slate-800/80 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm";

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
        game:                  form.game.trim() || 'valorant',
        format:                form.format,
        prize_pool:            parseFloat(form.prize_pool) || 0,
        team_size:             form.team_size,
        match_rules:           form.match_rules.trim() || undefined,
        region:                form.region.trim() || undefined,
        server:                form.server.trim() || undefined,
        map_pool:              form.map_pool.split(',').map((m) => m.trim()).filter(Boolean),
        veto_mode:             form.veto_mode,
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
    <div className="flex-1 space-y-4 overflow-y-auto sm:space-y-5">
      <div className="gaming-panel rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-200">
              <Zap className="h-3.5 w-3.5" />
              Organizer setup
            </div>
            <h1 className="premium-heading flex items-center gap-2">
              Create Tournament
              <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
            </h1>
            <p className="premium-subtle mt-1 max-w-2xl">
              Set the public listing, cafe logistics, match engine, and payout details from one control page.
            </p>
          </div>

          <div className="grid min-w-[220px] grid-cols-2 gap-2 rounded-xl border border-cyan-400/20 bg-slate-950/50 p-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-100/60">Readiness</p>
              <p className="mt-1 text-2xl font-bold text-cyan-100">{completionCount}/5</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-100/60">Status</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{form.status === 'published' ? 'Publishing' : 'Draft'}</p>
            </div>
            <div className="col-span-2 grid grid-cols-5 gap-1">
              {readyChecks.map((item) => (
                <div
                  key={item.label}
                  className={`h-1.5 rounded-full ${item.ready ? 'bg-emerald-400' : 'bg-slate-700'}`}
                  title={item.label}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="gaming-panel rounded-xl border border-cyan-400/20 bg-slate-950/45 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Trophy className="h-4 w-4 text-cyan-300" />
              Fast Setup Presets
            </h2>
            <p className="premium-subtle text-sm">Start from a cafe-ready template, then tune the details.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {TOURNAMENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="group rounded-lg border border-cyan-400/15 bg-slate-900/60 p-3 text-left transition-all hover:border-cyan-300/45 hover:bg-slate-800/70"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-cyan-100">{preset.label}</span>
                <span className="rounded-md border border-cyan-300/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200 group-hover:bg-cyan-500/10">
                  Apply
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full pb-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">

          <section className={`${sectionPanelClass} xl:col-span-7`}>
            <h2 className="section-title mb-1 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-cyan-300" />
              Public Listing
            </h2>
            <p className="premium-subtle mb-4 text-sm">What players see before they register.</p>
            <div className="h-px bg-cyan-500/20 mb-5" />
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Tournament Name *</label>
                <input
                  className={inputClass}
                  placeholder="e.g., Hash GTA Cup"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={textareaClass}
                  rows={4}
                  placeholder="Mention game mode, cafe check-in, prize highlights, and who can join."
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className={labelClass}>Visibility</label>
                  <button
                    type="button"
                    onClick={() => set('visibility', !form.visibility)}
                    className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-all ${
                      form.visibility
                        ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
                        : 'border-slate-600 bg-slate-900/70 text-slate-300'
                    }`}
                  >
                    {form.visibility ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {form.visibility ? 'Public' : 'Hidden'}
                  </button>
                </div>
                <div>
                  <label className={labelClass}>Publishing</label>
                  <select
                    className={selectClass}
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as EventStatus)}
                  >
                    <option value="draft">Save as Draft</option>
                    <option value="published">Publish Immediately</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <select
                    className={selectClass}
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

          <section className={`${sectionPanelClass} xl:col-span-5`}>
            <h2 className="section-title mb-1 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-300" />
              Banner
            </h2>
            <p className="premium-subtle mb-4 text-sm">A strong banner makes the public tournament card easier to trust.</p>
            <div className="h-px bg-cyan-500/20 mb-5" />
            <BannerUploader
              preview={bannerPreview}
              uploading={bannerUploading}
              onFileSelect={handleBannerSelect}
              onRemove={handleBannerRemove}
            />
          </section>

          <section className={`${sectionPanelClass} xl:col-span-7`}>
            <h2 className="section-title mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-300" />
              Schedule & Check-in
            </h2>
            <p className="premium-subtle mb-4 text-sm">Pick match day first, then set the registration cutoff.</p>
            <div className="h-px bg-cyan-500/20 mb-5" />

            <label className={`${labelClass} mb-3`}>Tournament Dates *</label>
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { label: 'Tonight', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: 'This Weekend', days: 3 },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => applyQuickDate(item.days)}
                  className="rounded-lg border border-cyan-300/20 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-cyan-300/45 hover:bg-slate-800"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['start', 'end', 'deadline'] as DateTarget[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActivePicker(t)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all
                    ${activePicker === t
                      ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100'
                      : 'border-cyan-300/25 bg-slate-900/70 text-slate-200 hover:border-cyan-300/45 hover:bg-slate-800/80'
                    }
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
              <MiniCalendar
                selected={dateValueMap[activePicker]}
                onSelect={handleDateSelect}
                minDate={activePicker === 'end' ? (startDate ?? undefined) : undefined}
              />

              <div className="space-y-4">
                <div className="rounded-lg border border-cyan-400/15 bg-slate-900/55 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-100/70">Suggested operations</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                      <span>Open check-in from the tournament detail page after registration closes.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CalendarDays className="mt-0.5 h-4 w-4 text-cyan-300" />
                      <span>Generate bracket only after confirmed teams are ready.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="mt-0.5 h-4 w-4 text-blue-300" />
                      <span>Use capacity to match available PCs/consoles and cafe seating.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={`${sectionPanelClass} xl:col-span-5`}>
            <h2 className="section-title mb-1 flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-cyan-300" />
              Match Engine
            </h2>
            <p className="premium-subtle mb-4 text-sm">How Hash will seed, create matches, and guide captains.</p>
            <div className="h-px bg-cyan-500/20 mb-5" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Game</label>
                <select
                  className={selectClass}
                  value={form.game}
                  onChange={(e) => set('game', e.target.value)}
                >
                  <option value="valorant">Valorant</option>
                  <option value="fc25">FC 25</option>
                  <option value="bgmi">BGMI</option>
                  <option value="custom">Custom Game</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Format</label>
                <select
                  className={selectClass}
                  value={form.format}
                  onChange={(e) => set('format', e.target.value as TournamentFormat)}
                >
                  <option value="single_elimination">Single Elimination</option>
                  <option value="double_elimination" disabled>Double Elimination - Phase 2</option>
                  <option value="swiss" disabled>Swiss - Phase 2</option>
                  <option value="round_robin" disabled>Round Robin - Phase 2</option>
                  <option value="group_playoffs" disabled>Group + Playoffs - Phase 2</option>
                  <option value="ladder" disabled>Ladder - Phase 2</option>
                  <option value="daily_cup" disabled>Daily Cup - Phase 2</option>
                </select>
              </div>
              </div>
              <div>
                <label className={labelClass}>Region / Server</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder="Region"
                    value={form.region}
                    onChange={(e) => set('region', e.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder="Server"
                    value={form.server}
                    onChange={(e) => set('server', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Map Pool</label>
                <input
                  className={inputClass}
                  placeholder="Bind, Haven, Ascent"
                  value={form.map_pool}
                  onChange={(e) => set('map_pool', e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">{mapPoolCount} maps configured for veto/admin selection.</p>
              </div>
              <div>
                <label className={labelClass}>Map Veto</label>
                <select
                  className={selectClass}
                  value={form.veto_mode}
                  onChange={(e) => set('veto_mode', e.target.value as VetoMode)}
                >
                  <option value="none">No Veto</option>
                  <option value="bo1_ban_until_decider">BO1 Ban Until Decider</option>
                  <option value="bo3_ban_pick_decider">BO3 Ban/Pick Decider</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Match Rules</label>
                <textarea
                  className={textareaClass}
                  rows={4}
                  placeholder="Lobby rules, reporting rules, late penalties, screenshot requirements..."
                  value={form.match_rules}
                  onChange={(e) => set('match_rules', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className={`${sectionPanelClass} xl:col-span-7`}>
            <h2 className="section-title mb-1 flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-300" />
              Capacity & Prize
            </h2>
            <p className="premium-subtle mb-4 text-sm">Keep this aligned with available PCs/consoles, seating, and staff bandwidth.</p>
            <div className="h-px bg-cyan-500/20 mb-5" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Max Teams</label>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  placeholder="e.g., 16"
                  value={form.capacity_team}
                  onChange={(e) => set('capacity_team', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Max Players</label>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  placeholder="e.g., 80"
                  value={form.capacity_player}
                  onChange={(e) => set('capacity_player', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Team Size</label>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  value={form.team_size}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    set('team_size', value);
                    set('min_team_size', value);
                    set('max_team_size', value);
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Team Size Range</label>
                <div className="flex items-center gap-2">
                  <input
                    className={inputClass}
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
                    className={inputClass}
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
              <div>
                <label className={labelClass}>
                  Entry Fee ({form.currency})
                </label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g., 500"
                  value={form.registration_fee}
                  onChange={(e) => set('registration_fee', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Prize Pool ({form.currency})
                </label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  placeholder="e.g., 5000"
                  value={form.prize_pool}
                  onChange={(e) => set('prize_pool', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {([
                    { key: 'allow_solo'       as const, label: 'Allow solo players'            },
                    { key: 'allow_individual' as const, label: 'Allow individual registration' },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set(key, !(form[key] as boolean))}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-all ${
                        form[key]
                          ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
                          : 'border-cyan-400/15 bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      {label}
                      <span className="text-xs">{form[key] ? 'On' : 'Off'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className={`${sectionPanelClass} xl:col-span-12`}>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
              {[
                { label: 'Game', value: form.game || 'Not set', icon: <Gamepad2 className="h-4 w-4 text-cyan-300" /> },
                { label: 'Teams', value: maxTeams ? `${maxTeams} max` : 'Unset', icon: <Users className="h-4 w-4 text-blue-300" /> },
                { label: 'Server', value: form.server || form.region || 'Unset', icon: <RadioTower className="h-4 w-4 text-emerald-300" /> },
                { label: 'Prize', value: `${form.currency} ${prize}`, icon: <Banknote className="h-4 w-4 text-yellow-300" /> },
                { label: 'Fee', value: `${form.currency} ${fee}`, icon: <Trophy className="h-4 w-4 text-orange-300" /> },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-cyan-400/15 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-100/60">{item.label}</p>
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-slate-100">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <MapPinned className="h-4 w-4 text-cyan-300" />
              <span>{mapPoolCount ? `${mapPoolCount} maps ready` : 'No map pool configured'}</span>
              <span className="text-slate-600">|</span>
              <span>{maxPlayers ? `${maxPlayers} player capacity` : 'Player capacity can be auto-derived from teams and size'}</span>
              <span className="text-slate-600">|</span>
              <span>{form.format.replaceAll('_', ' ')}</span>
            </div>
          </aside>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 xl:col-span-12">
              <p className="text-sm font-medium text-red-300">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 xl:col-span-12">
            <button
              className={secondaryButtonClass}
              onClick={() => router.push('/tournaments')}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className={`${primaryButtonClass} min-w-[10rem] justify-center`}
              onClick={handleSubmit}
              disabled={isLoading || tokenLoading}
            >
              {bannerUploading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Uploading banner...
                </>
              ) : submitting ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
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
