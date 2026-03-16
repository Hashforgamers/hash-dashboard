"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/app/(layout)/dashboard-layout";
import { Star, MessageSquare, EyeOff, Eye, Search } from "lucide-react";
import {
  getReviewSummary,
  listReviews,
  respondToReview,
  updateReviewStatus,
  ReviewItem,
  ReviewSummary,
} from "@/lib/review-api";
import { useModuleCache } from "@/app/hooks/useModuleCache";
import { useDashboardData } from "@/app/context/DashboardDataContext";

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RatingStars({ rating }: { rating: number }) {
  const safe = Math.max(0, Math.min(5, rating));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= safe ? "text-amber-400 fill-amber-400" : "text-slate-600"}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { vendorId } = useDashboardData();
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("");
  const [search, setSearch] = useState("");
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [actioningId, setActioningId] = useState<string | null>(null);

  const summaryKey = vendorId ? `reviews_summary:${vendorId}` : "reviews_summary:0";
  const listKey = vendorId ? `reviews_list:${vendorId}:${statusFilter}:${ratingFilter}:${search}` : "reviews_list:0";
  const versionKey = vendorId ? `reviews:${vendorId}` : "reviews:0";

  const summaryFetcher = async () => {
    if (!token) throw new Error("Missing token");
    return getReviewSummary(token);
  };

  const listFetcher = async () => {
    if (!token) throw new Error("Missing token");
    return listReviews(token, {
      status: statusFilter,
      rating: ratingFilter || undefined,
      search: search || undefined,
      limit: 50,
      offset: 0,
    });
  };

  const { data: cachedSummary, refresh: refreshSummaryCache } = useModuleCache<ReviewSummary>(
    summaryKey,
    summaryFetcher,
    120000,
    versionKey
  );
  const { data: cachedList, refresh: refreshListCache } = useModuleCache<{ items: ReviewItem[] }>(
    listKey,
    listFetcher,
    120000,
    versionKey
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const accessToken =
      localStorage.getItem("rbac_access_token_v1") || localStorage.getItem("jwtToken");
    setToken(accessToken);
  }, []);

  const refreshSummary = async () => {
    setLoadingSummary(true);
    try {
      const data = await refreshSummaryCache(true);
      setSummary(data || null);
    } catch {
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  const refreshReviews = async () => {
    setLoading(true);
    try {
      const data = await refreshListCache(true);
      setReviews(data?.items || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (cachedSummary) {
      setSummary(cachedSummary);
      return;
    }
    refreshSummary();
  }, [token, cachedSummary]);

  useEffect(() => {
    if (!token) return;
    if (cachedList?.items) {
      setReviews(cachedList.items);
      return;
    }
    refreshReviews();
  }, [token, cachedList, statusFilter, ratingFilter, search]);

  const breakdown = useMemo(() => {
    const total = summary?.total || 0;
    return [5, 4, 3, 2, 1].map((n) => {
      const count = summary ? summary[`r${n}` as keyof ReviewSummary] : 0;
      const pct = total > 0 ? Math.round((Number(count || 0) / total) * 100) : 0;
      return { rating: n, count: Number(count || 0), pct };
    });
  }, [summary]);

  const handleRespond = async (reviewId: string) => {
    if (!token) return;
    const draft = (responseDrafts[reviewId] || "").trim();
    if (!draft) return;
    setActioningId(reviewId);
    try {
      await respondToReview(token, reviewId, draft);
      setResponseDrafts((prev) => ({ ...prev, [reviewId]: "" }));
      await refreshReviews();
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleStatus = async (reviewId: string, status: "published" | "hidden") => {
    if (!token) return;
    setActioningId(reviewId);
    try {
      await updateReviewStatus(token, reviewId, status);
      await refreshReviews();
      await refreshSummary();
    } finally {
      setActioningId(null);
    }
  };

  return (
    <DashboardLayout contentScroll="contained">
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3 sm:gap-4">
        <div className="gaming-panel shrink-0 rounded-xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="premium-heading">Cafe Reviews</h1>
              <p className="premium-subtle mt-1">Transparent feedback from gamers and responses from your team.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="gaming-panel rounded-xl border border-cyan-400/20 bg-slate-950/45 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Average Rating</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-3xl font-bold text-cyan-100">
                {summary ? summary.average.toFixed(2) : "--"}
              </span>
              <RatingStars rating={summary?.average || 0} />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {loadingSummary ? "Loading..." : `Based on ${summary?.total || 0} reviews`}
            </p>
          </div>

          <div className="gaming-panel rounded-xl border border-cyan-400/20 bg-slate-950/45 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Ratings Breakdown</p>
            <div className="mt-3 space-y-2">
              {breakdown.map((row) => (
                <div key={row.rating} className="flex items-center gap-3">
                  <span className="w-6 text-xs text-slate-300">{row.rating}★</span>
                  <div className="h-2 flex-1 rounded-full bg-slate-800/70">
                    <div
                      className="h-2 rounded-full bg-emerald-400/80"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-slate-400">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="gaming-panel rounded-xl border border-cyan-400/20 bg-slate-950/45 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Filters</p>
            <div className="dashboard-filter-stack mt-3">
              <select
                className="dashboard-module-input h-10 w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </select>
              <select
                className="dashboard-module-input h-10 w-full"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option value="">All Ratings</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} Stars</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  className="dashboard-module-input h-10 w-full pl-9 pr-3"
                  placeholder="Search reviews..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="gaming-panel flex-1 overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950/45">
          <div className="flex items-center justify-between gap-3 border-b border-cyan-500/20 p-4">
            <h2 className="section-title">Recent Reviews</h2>
            <span className="text-xs text-slate-400">{reviews.length} items</span>
          </div>
          <div className="max-h-[calc(100vh-420px)] overflow-y-auto p-4">
            {loading ? (
              <div className="dashboard-loader text-sm">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="dashboard-empty-state text-sm">No reviews yet.</div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-cyan-400/15 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {review.user?.name || "Anonymous"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <RatingStars rating={review.rating} />
                        <span className="text-xs text-slate-400">{review.rating}/5</span>
                      </div>
                    </div>

                    {review.title && (
                      <p className="mt-3 text-sm font-medium text-slate-200">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="mt-1 text-sm text-slate-300">{review.comment}</p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className={`rounded-full px-2 py-1 ${review.status === "published" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                        {review.status === "published" ? "Published" : "Hidden"}
                      </span>
                      {review.response_text && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-1 text-cyan-200">
                          <MessageSquare className="h-3 w-3" />
                          Responded
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <textarea
                        className="w-full rounded-lg border border-cyan-400/20 bg-slate-900/70 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                        rows={3}
                        placeholder="Write a response to this review..."
                        value={responseDrafts[review.id] ?? review.response_text ?? ""}
                        onChange={(e) =>
                          setResponseDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))
                        }
                      />
                      <div className="flex items-center justify-between gap-2">
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:border-cyan-300/70 hover:bg-cyan-500/25"
                          onClick={() => handleRespond(review.id)}
                          disabled={actioningId === review.id}
                        >
                          <MessageSquare className="h-4 w-4" />
                          {review.response_text ? "Update Response" : "Send Response"}
                        </button>
                        {review.status === "published" ? (
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition-colors hover:border-rose-300/60 hover:bg-rose-500/20"
                            onClick={() => handleToggleStatus(review.id, "hidden")}
                            disabled={actioningId === review.id}
                          >
                            <EyeOff className="h-4 w-4" />
                            Hide
                          </button>
                        ) : (
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-300/60 hover:bg-emerald-500/20"
                            onClick={() => handleToggleStatus(review.id, "published")}
                            disabled={actioningId === review.id}
                          >
                            <Eye className="h-4 w-4" />
                            Publish
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
