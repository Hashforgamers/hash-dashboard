import { DASHBOARD_URL } from "@/src/config/env";

const API_BASE = DASHBOARD_URL || 'http://localhost:5000';


// ─── Types ────────────────────────────────────────────────────────────────────

export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'canceled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
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
}

export interface EventItem {
  id: string;
  title: string;
  status: EventStatus;
  start_at: string;
  end_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  team_id: string;
  team_name?: string;          // joined by API if available
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  waiver_signed: boolean;
  payment_status: PaymentStatus;
  status: RegistrationStatus;
  notes: string | null;
  created_at: string;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export async function getVendorJwt(vendorId: number, ttlMinutes = 480): Promise<string> {
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

export async function createEvent(token: string, payload: EventPayload): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/vendor/events/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create event');
  return data;
}

export async function listEvents(token: string, status?: string): Promise<EventItem[]> {
  const qs = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/api/vendor/events/${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch events');
  return data as EventItem[];
}

// ─── Registrations ────────────────────────────────────────────────────────────

export async function getRegistrations(token: string, eventId: string): Promise<Registration[]> {
  const res = await fetch(`${API_BASE}/api/vendor/events/${eventId}/registrations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json() as Promise<Registration[]>;
}
