import { DASHBOARD_URL } from "@/src/config/env";
import { httpJson } from "@/lib/http-client";

const API_BASE = DASHBOARD_URL || "http://localhost:5000";

export interface ReviewUser {
  id: number | null;
  name: string | null;
  avatar?: string | null;
  game_username?: string | null;
}

export interface ReviewItem {
  id: string;
  vendor_id: number;
  rating: number;
  title?: string | null;
  comment?: string | null;
  status: "published" | "hidden";
  created_at: string | null;
  response_text?: string | null;
  responded_at?: string | null;
  user: ReviewUser;
}

export interface ReviewSummary {
  total: number;
  average: number;
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  r5: number;
}

export interface ReviewListResponse {
  items: ReviewItem[];
  limit: number;
  offset: number;
  count: number;
}

function withQuery(url: string, params?: Record<string, string | number | undefined>) {
  if (!params) return url;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "" && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `${url}?${qs}` : url;
}

export async function getReviewSummary(token: string, vendorId?: number): Promise<ReviewSummary> {
  const url = withQuery(`${API_BASE}/api/vendor/reviews/summary`, {
    vendor_id: vendorId,
  });
  return httpJson<ReviewSummary>(url, {
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 10_000,
    retries: 2,
    dedupe: true,
    dedupeKey: `GET:${url}`,
    cacheTtlMs: 10_000,
  });
}

export async function listReviews(
  token: string,
  params?: { status?: string; rating?: number | string; search?: string; limit?: number; offset?: number; vendor_id?: number }
): Promise<ReviewListResponse> {
  const url = withQuery(`${API_BASE}/api/vendor/reviews/`, params);
  return httpJson<ReviewListResponse>(url, {
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 12_000,
    retries: 2,
    dedupe: true,
    dedupeKey: `GET:${url}`,
    cacheTtlMs: 7_000,
  });
}

export async function respondToReview(
  token: string,
  reviewId: string,
  response_text: string
): Promise<{ ok: boolean }> {
  return httpJson<{ ok: boolean }>(`${API_BASE}/api/vendor/reviews/${reviewId}/response`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ response_text }),
    timeoutMs: 10_000,
    retries: 0,
  });
}

export async function updateReviewStatus(
  token: string,
  reviewId: string,
  status: "published" | "hidden"
): Promise<{ ok: boolean }> {
  return httpJson<{ ok: boolean }>(`${API_BASE}/api/vendor/reviews/${reviewId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
    timeoutMs: 10_000,
    retries: 0,
  });
}
