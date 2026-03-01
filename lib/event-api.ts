import { DASHBOARD_URL } from "@/src/config/env";

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

export interface BannerUploadResult {
  url: string;
  public_id: string;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export async function getVendorJwt(
  vendorId: number,
  ttlMinutes = 480
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/vendor/events/getJwt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendor_id: vendorId, ttl_minutes: ttlMinutes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to issue JWT');
  return data.token as string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function createEvent(
  token: string,
  payload: EventPayload
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/vendor/events/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create event');
  return data;
}

export async function listEvents(
  token: string,
  status?: string
): Promise<EventItem[]> {
  const qs  = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/api/vendor/events/${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch events');
  return data as EventItem[];
}

export async function updateEvent(
  token: string,
  eventId: string,
  patch: Partial<EventPayload>
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/api/vendor/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update event');
  return data;
}

// ─── Registrations ────────────────────────────────────────────────────────────

export async function getRegistrations(
  token: string,
  eventId: string
): Promise<Registration[]> {
  const res = await fetch(
    `${API_BASE}/api/vendor/events/${eventId}/registrations`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  return res.json() as Promise<Registration[]>;
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
  const res = await fetch(`${API_BASE}/api/vendor/events/upload-banner`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Banner upload failed');
  return data as BannerUploadResult;
}

export async function deleteEventBanner(
  token: string,
  publicId: string
): Promise<void> {
  await fetch(`${API_BASE}/api/vendor/events/delete-banner`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ public_id: publicId }),
  });
}
