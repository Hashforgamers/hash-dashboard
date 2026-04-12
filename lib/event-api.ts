import { DASHBOARD_URL } from "@/src/config/env";
import { httpJson } from "@/lib/http-client";

const API_BASE = DASHBOARD_URL || 'http://localhost:5000';


// ─── Types ────────────────────────────────────────────────────────────────────

export type EventStatus       = 'draft' | 'published' | 'ongoing' | 'completed' | 'canceled';
export type PaymentStatus     = 'pending' | 'paid' | 'failed' | 'refunded';
export type RegistrationStatus = 'pending' | 'confirmed' | 'rejected' | 'canceled';

export interface EventPayload {
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  registration_fee?: number;
  currency?: string;
  registration_deadline?: string;
  capacity_team?: number;
  capacity_player?: number;
  min_team_size?: number;
  max_team_size?: number;
  allow_solo?: boolean;
  allow_individual?: boolean;
  visibility?: boolean;
  status?: EventStatus;
  qr_code_url?: string;
  banner_image_url?: string;
  banner_public_id?: string;
}

export interface EventItem {
  id: string;
  title: string;
  status: EventStatus;
  start_at: string;
  end_at: string;
  banner_image_url?: string | null;
}

export interface Registration {
  id: string;
  event_id: string;
  team_id: string;
  team_name?: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  waiver_signed: boolean;
  payment_status: PaymentStatus;
  status: RegistrationStatus;
  notes: string | null;
  created_at: string;
}

export interface TeamItem {
  id: string;
  name: string;
  created_by_user: number | string;
  created_at: string;
  is_individual: boolean;
  member_count?: number;
}

export interface WinnerInput {
  team_id: string;
  rank: number;
  verified_snapshot?: string | null;
}

export interface BannerUploadResult {
  url: string;
  public_id: string;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export async function getVendorJwt(
  vendorId: number,
  ttlMinutes = 480
): Promise<string> {
  const data = await httpJson<{ token: string }>(`${API_BASE}/api/vendor/events/getJwt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendor_id: vendorId, ttl_minutes: ttlMinutes }),
    timeoutMs: 10_000,
    retries: 0,
  });
  return data.token as string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function createEvent(
  token: string,
  payload: EventPayload
): Promise<{ id: string }> {
  return httpJson<{ id: string }>(`${API_BASE}/api/vendor/events/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    timeoutMs: 15_000,
    retries: 0,
  });
}

export async function listEvents(
  token: string,
  status?: string
): Promise<EventItem[]> {
  const qs  = status ? `?status=${status}` : '';
  return httpJson<EventItem[]>(`${API_BASE}/api/vendor/events/${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 10_000,
    retries: 2,
    retryDelayMs: 250,
    dedupe: true,
    dedupeKey: `GET:${API_BASE}/api/vendor/events/${qs}`,
    cacheTtlMs: 10_000,
  });
}

export async function updateEvent(
  token: string,
  eventId: string,
  patch: Partial<EventPayload>
): Promise<{ ok: boolean }> {
  return httpJson<{ ok: boolean }>(`${API_BASE}/api/vendor/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
    timeoutMs: 15_000,
    retries: 0,
  });
}

// ─── Registrations ────────────────────────────────────────────────────────────

export async function getRegistrations(
  token: string,
  eventId: string
): Promise<Registration[]> {
  try {
    return await httpJson<Registration[]>(`${API_BASE}/api/vendor/events/${eventId}/registrations`, {
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 10_000,
      retries: 2,
      dedupe: true,
      dedupeKey: `GET:${API_BASE}/api/vendor/events/${eventId}/registrations`,
      cacheTtlMs: 7_000,
    });
  } catch {
    return [];
  }
}

export async function getTeams(
  token: string,
  eventId: string
): Promise<TeamItem[]> {
  try {
    return await httpJson<TeamItem[]>(`${API_BASE}/api/vendor/events/${eventId}/teams`, {
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 10_000,
      retries: 2,
      dedupe: true,
      dedupeKey: `GET:${API_BASE}/api/vendor/events/${eventId}/teams`,
      cacheTtlMs: 7_000,
    });
  } catch {
    return [];
  }
}

export async function publishResults(
  token: string,
  eventId: string,
  winners: WinnerInput[]
): Promise<{ ok: boolean }> {
  return httpJson<{ ok: boolean }>(`${API_BASE}/api/vendor/events/${eventId}/results/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ winners }),
    timeoutMs: 15_000,
    retries: 0,
  });
}

// ─── Banner (Cloudinary) ──────────────────────────────────────────────────────

export async function uploadEventBanner(
  token: string,
  imageFile: File,
  eventTitle: string
): Promise<BannerUploadResult> {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('event_title', eventTitle);

  // ⚠️ No Content-Type header — browser sets multipart boundary automatically
  return httpJson<BannerUploadResult>(`${API_BASE}/api/vendor/events/upload-banner`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    timeoutMs: 25_000,
    retries: 0,
  });
}

export async function deleteEventBanner(
  token: string,
  publicId: string
): Promise<void> {
  await httpJson<void>(`${API_BASE}/api/vendor/events/delete-banner`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ public_id: publicId }),
    parseAs: "void",
    timeoutMs: 10_000,
    retries: 0,
  });
}
