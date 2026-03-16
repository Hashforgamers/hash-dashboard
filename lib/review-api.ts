import { DASHBOARD_URL } from "@/src/config/env";

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

export async function getReviewSummary(token: string): Promise<ReviewSummary> {
  const res = await fetch(`${API_BASE}/api/vendor/reviews/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch review summary");
  return res.json() as Promise<ReviewSummary>;
}

export async function listReviews(
  token: string,
  params?: { status?: string; rating?: number | string; search?: string; limit?: number; offset?: number }
): Promise<ReviewListResponse> {
  const url = withQuery(`${API_BASE}/api/vendor/reviews`, params);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json() as Promise<ReviewListResponse>;
}

export async function respondToReview(
  token: string,
  reviewId: string,
  response_text: string
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/api/vendor/reviews/${reviewId}/response`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ response_text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to respond");
  return data;
}

export async function updateReviewStatus(
  token: string,
  reviewId: string,
  status: "published" | "hidden"
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/api/vendor/reviews/${reviewId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update status");
  return data;
}
