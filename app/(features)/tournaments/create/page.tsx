'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Upload, X, ImageIcon, Trophy,
  Gamepad2, MapPinned, ShieldCheck, Users,
  Clock, Banknote, RadioTower, ListChecks,
  Eye, EyeOff,
} from 'lucide-react';
import { useEventsToken } from '@/hooks/useEventsToken';
import { createEvent, uploadEventBanner, deleteEventBanner, EventStatus, TournamentFormat, VetoMode, getEffectiveEventStatus } from '@/lib/event-api';
import { localDateTime, suggestedSchedule, quickTournamentStart, playerCapacity } from '@/lib/tournament-setup';
import { DashboardLayout } from '@/app/(layout)/dashboard-layout';
import { useDashboardData } from '@/app/context/DashboardDataContext';

 // TODO: replace with auth context

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
        1200 × 630 px · PNG, JPG or WEBP
      </p>

      {preview ? (
        /* ── Preview with hover controls ── */
        <div
          className="relative w-full max-h-48 rounded-lg overflow-hidden border border-border group"
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
              <p className="text-white text-xs font-medium">Uploading...</p>
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
  const { vendorId, bumpModuleVersion } = useDashboardData();
  const { token, loading: tokenLoading } = useEventsToken(vendorId);
  const [timezone, setTimezone] = useState("local time");

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
  const endEdited = useRef(false);
  const deadlineEdited = useRef(false);
  const [autoPlayers, setAutoPlayers] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState('');

  // Banner state
  const [bannerFile,      setBannerFile]      = useState<File | null>(null);
  const [bannerPreview,   setBannerPreview]   = useState<string | null>(null);
  const [bannerPublicId,  setBannerPublicId]  = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const applyPreset = (preset: TournamentPreset) => {
    setForm((current) => ({ ...current, allow_solo: false, allow_individual: false,
      region: 'India', server: '', map_pool: '', veto_mode: 'none', ...preset.patch }));
    setAutoPlayers(true);
    setSelectedPreset(preset.id);
  };
  const updateStart = (start: Date | null) => {
    setStartDate(start);
    if (!start) return;
    const suggested = suggestedSchedule(start);
    if (!endEdited.current) setEndDate(suggested.end);
    if (!deadlineEdited.current) setDeadline(suggested.deadline);
  };
  const applyQuickDate = (choice: 'today' | 'tomorrow' | 'weekend') => {
    endEdited.current = false;
    deadlineEdited.current = false;
    updateStart(quickTournamentStart(choice));
  };
  const effectivePlayerCapacity = autoPlayers ? playerCapacity(form.capacity_team, form.team_size) : form.capacity_player;
  const mapPoolCount = form.map_pool.split(',').map((m) => m.trim()).filter(Boolean).length;
  const maxTeams = parseInt(form.capacity_team) || 0;
  const maxPlayers = parseInt(effectivePlayerCapacity) || 0;
  const readyChecks = [
    { label: 'Name', ready: Boolean(form.title.trim()) },
    { label: 'Dates', ready: Boolean(startDate && endDate && endDate > startDate && (!deadline || deadline < startDate)) },
    { label: 'Game', ready: Boolean(form.game && form.format) },
    { label: 'Capacity', ready: Boolean(maxTeams || maxPlayers) },
    { label: 'Rules', ready: Boolean(form.match_rules.trim()) },
  ];
  const completionCount = readyChecks.filter((item) => item.ready).length;
  const sectionPanelClass = "gaming-panel rounded-lg border border-border bg-muted/10 p-3";
  const labelClass = "mb-1 block text-xs font-medium text-slate-300";
  const inputClass = "h-9 w-full rounded-lg border border-cyan-400/25 bg-slate-900/70 px-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60";
  const textareaClass = "w-full rounded-lg border border-cyan-400/25 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60";
  const selectClass = "h-9 w-full rounded-lg border border-cyan-400/25 bg-slate-900/70 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60";
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

  const expectedStatus = startDate && endDate
    ? getEffectiveEventStatus({
        status: form.status,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
      })
    : form.status;

  const expectedStatusLabel: Record<EventStatus, string> = {
    draft: 'Draft',
    published: 'Published',
    ongoing: 'Live',
    completed: 'Completed',
    canceled: 'Canceled',
  };

  // ── Validation + Submit ───────────────────────────
  const handleSubmit = async () => {
    if (!token)                          return setError('Session not ready. Please wait a moment.');
    if (!form.title.trim())              return setError('Tournament name is required.');
    if (!startDate)                      return setError('Start date is required.');
    if (!endDate)                        return setError('End date is required.');
    if (endDate <= startDate)             return setError('End date must be after start date.');
    if (form.min_team_size > form.max_team_size) return setError('Min team size cannot exceed max team size.');
    if (deadline && deadline >= startDate) return setError('Registration deadline must be before start date.');

    if (submitting) return;
    for (const [label, value] of [['Entry fee', form.registration_fee], ['Prize pool', form.prize_pool]] as const) {
      if (!Number.isFinite(Number(value)) || Number(value) < 0) return setError(`${label} must be zero or more.`);
    }
    for (const [label, value] of [['Team capacity', form.capacity_team], ['Player capacity', effectivePlayerCapacity]] as const) {
      if (value && (!Number.isInteger(Number(value)) || Number(value) < 1)) return setError(`${label} must be a positive whole number.`);
    }
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
        capacity_player:       effectivePlayerCapacity ? Number(effectivePlayerCapacity) : undefined,
        min_team_size:         form.min_team_size,
        max_team_size:         form.max_team_size,
        allow_solo:            form.allow_solo,
        allow_individual:      form.allow_individual,
        visibility:            form.visibility,
        status:                form.status,
        banner_image_url,
        banner_public_id,
      });

      if (vendorId) {
        bumpModuleVersion(`tournaments:${vendorId}`);
      }
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
    <div className="tournament-create flex-1 space-y-3 overflow-y-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="premium-heading !text-lg">Create Tournament</h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{completionCount}/5 ready</span>
          <span className="rounded-md border border-border px-2 py-1 text-foreground">{expectedStatusLabel[expectedStatus]}</span>
        </div>
      </header>

      <div className="gaming-panel rounded-lg border border-border bg-muted/10 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Trophy className="h-4 w-4 text-cyan-300" />
              Presets
            </h2>

          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {TOURNAMENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              aria-pressed={selectedPreset === preset.id}
              title={preset.description}
              className="group rounded-lg border border-cyan-400/15 bg-slate-900/60 p-3 text-left transition-all hover:border-cyan-300/45 hover:bg-slate-800/70"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-cyan-100">{preset.label}</span>
                <span className="rounded-md border border-cyan-300/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200 group-hover:bg-cyan-500/10">
                  {selectedPreset === preset.id ? "Selected" : "Use"}
                </span>
              </div>

            </button>
          ))}
        </div>
      </div>

      <div className="w-full pb-6">
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">

          <section className={`${sectionPanelClass} lg:col-span-6`}>
            <h2 className="section-title mb-1 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-cyan-300" />
              Basics
            </h2>

            <div className="h-px bg-cyan-500/20 mb-3" />
            <div className="space-y-3">
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
                  rows={2}
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
                    className={`flex h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-all ${
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



          <section className={`${sectionPanelClass} lg:col-span-6`}>
            <h2 className="section-title mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-300" />
              Schedule
            </h2>

            <div className="h-px bg-cyan-500/20 mb-3" />

            <div className="mb-3 flex flex-wrap gap-2">
              {([['today', 'Today'], ['tomorrow', 'Tomorrow'], ['weekend', 'Saturday']] as const).map(([choice, label]) => (
                <button key={choice} type="button" onClick={() => applyQuickDate(choice)} className={secondaryButtonClass}>{label}</button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Starts *
                <input type="datetime-local" className={`${inputClass} mt-1`} value={localDateTime(startDate)}
                  onChange={(e) => updateStart(e.target.value ? new Date(e.target.value) : null)} />
              </label>
              <label className={labelClass}>Ends *
                <input type="datetime-local" className={`${inputClass} mt-1`} min={localDateTime(startDate)} value={localDateTime(endDate)}
                  onChange={(e) => { endEdited.current = true; setEndDate(e.target.value ? new Date(e.target.value) : null); }} />
              </label>
              <label className={`${labelClass} sm:col-span-2`}>Registration closes
                <input type="datetime-local" className={`${inputClass} mt-1`} max={localDateTime(startDate)} value={localDateTime(deadline)}
                  onChange={(e) => { deadlineEdited.current = true; setDeadline(e.target.value ? new Date(e.target.value) : null); }} />
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-400">Auto: 5-hour event, registration closes 1 hour before. Times are editable ({timezone}).</p>
          </section>

          <section className={`${sectionPanelClass} lg:col-span-6`}>
            <h2 className="section-title mb-1 flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-cyan-300" />
              Game & rules
            </h2>

            <div className="h-px bg-cyan-500/20 mb-3" />
            <div className="space-y-3">
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






                </select>
              </div>
              </div>
              <details className="rounded-lg border border-border p-2.5">
                <summary className="cursor-pointer text-xs font-medium">Server, maps & veto</summary>
                <div className="mt-3 space-y-3">
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
                </div>
              </details>
              <div>
                <label className={labelClass}>Match Rules</label>
                <textarea
                  className={textareaClass}
                  rows={2}
                  placeholder="Lobby rules, reporting rules, late penalties, screenshot requirements..."
                  value={form.match_rules}
                  onChange={(e) => set('match_rules', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className={`${sectionPanelClass} lg:col-span-6`}>
            <h2 className="section-title mb-1 flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-300" />
              Capacity & Prize
            </h2>

            <div className="h-px bg-cyan-500/20 mb-3" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className={labelClass} htmlFor="player-capacity">Max players</label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400"><input type="checkbox" checked={autoPlayers} onChange={(e) => {
                    if (!e.target.checked) set('capacity_player', effectivePlayerCapacity);
                    setAutoPlayers(e.target.checked);
                  }} /> Auto</label>
                </div>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  placeholder="e.g., 80"
                  id="player-capacity"
                  readOnly={autoPlayers}
                  value={effectivePlayerCapacity}
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



          <details className={`${sectionPanelClass} lg:col-span-12`}>
            <summary className="cursor-pointer text-sm font-semibold">Banner <span className="font-normal text-slate-400">· Optional</span></summary>
            <div className="mt-3 max-w-md">
              <BannerUploader preview={bannerPreview} uploading={bannerUploading} onFileSelect={handleBannerSelect} onRemove={handleBannerRemove} />
            </div>
          </details>

          {error && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 lg:col-span-12">
              <p className="text-sm font-medium text-red-300">{error}</p>
            </div>
          )}

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 lg:col-span-12">
            <p className="text-xs text-muted-foreground">{maxTeams || '—'} teams · {maxPlayers || '—'} players · Entry {form.currency} {form.registration_fee || '0'}</p>
            <div className="flex items-center gap-2">
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
              disabled={isLoading || tokenLoading || !token}
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
    </div>
    </DashboardLayout>
  );
}
