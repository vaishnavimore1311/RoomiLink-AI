"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { RoommateCandidate } from "@/types/matching";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import CompatibilityScoreBadge from "@/components/CompatibilityScoreBadge";
import MatchExplanationModal from "@/components/MatchExplanationModal";

function RoommatesContent() {
  const { isAuthenticated, user } = useAuth();
  const [candidates, setCandidates] = useState<RoommateCandidate[]>([]);
  const [isLimited, setIsLimited] = useState<boolean>(false);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [minScore, setMinScore] = useState<number>(50);
  const [maxBudget, setMaxBudget] = useState<number>(25000);
  const [selectedRoutine, setSelectedRoutine] = useState<string>("all");
  const [hasRoomOnly, setHasRoomOnly] = useState(false);

  // Selected candidate for breakdown modal
  const [activeModalCandidate, setActiveModalCandidate] = useState<RoommateCandidate | null>(null);

  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (city.trim()) params.append("city", city.trim());
      if (search.trim()) params.append("search", search.trim());
      if (minScore > 0) params.append("min_score", minScore.toString());
      if (maxBudget) params.append("budget_max", maxBudget.toString());

      const res = await apiRequest<{
        data: RoommateCandidate[];
        count: number;
        total_matches?: number;
        is_limited?: boolean;
        limit?: number | null;
        has_active_subscription?: boolean;
      }>(
        `/matching/roommates?${params.toString()}`,
        { requiresAuth: false }
      );

      if (res.data?.data) {
        setCandidates(res.data.data);
        setIsLimited(Boolean(res.data.is_limited));
        setTotalMatches(res.data.total_matches ?? res.data.data.length);
        setHasActiveSub(Boolean(res.data.has_active_subscription));
      } else {
        setError(res.error || "Failed to load roommate candidates.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading candidates.");
    } finally {
      setIsLoading(false);
    }
  }, [city, search, minScore, maxBudget]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const filteredCandidates = candidates.filter((c) => {
    if (selectedRoutine !== "all" && c.lifestyle?.work_routine !== selectedRoutine) return false;
    if (hasRoomOnly && !c.active_room_share) return false;
    return true;
  });

  const isUserPremium = hasActiveSub || Boolean(user?.subscription?.is_active) || user?.role === "admin";
  const showUpgradePrompt = !isUserPremium && (isLimited || candidates.length >= 2);

  const resetFilters = () => {
    setSearch("");
    setCity("");
    setMinScore(50);
    setMaxBudget(25000);
    setSelectedRoutine("all");
    setHasRoomOnly(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold">
              <span>✨ Algorithmic Lifestyle Matching</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Find Roommates Who Live Like You
            </h1>
            <p className="text-indigo-200 text-sm sm:text-base leading-relaxed">
              Explore compatible co-living partners ranked by mathematical alignment across 8 lifestyle dimensions — from sleep cycles and cleanliness to quiet hours and budget.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {!isAuthenticated ? (
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 text-sm transition"
              >
                Sign Up & Set Lifestyle Profile
              </Link>
            ) : (
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold rounded-2xl text-sm transition"
              >
                Update My 8 Dimensions
              </Link>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Keyword or Occupation
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Software Engineer, Student..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
              />
            </div>

            {/* City Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target City / Pune Locality
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Pune, Hinjewadi, Baner, Wakad..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
              />
            </div>

            {/* Min Compatibility Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                <span>Min Match Score</span>
                <span className="text-indigo-600 font-bold">{minScore}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Max Budget Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                <span>Max Budget Limit</span>
                <span className="text-indigo-600 font-bold">₹{maxBudget.toLocaleString("en-IN")}/mo</span>
              </div>
              <input
                type="range"
                min="3000"
                max="35000"
                step="500"
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          {/* Quick Work Routine Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 mr-1">Work Routine:</span>
              {[
                { label: "All Routines", value: "all" },
                { label: "Remote", value: "remote" },
                { label: "Hybrid", value: "hybrid" },
                { label: "On-Site", value: "on_site" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setSelectedRoutine(pill.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                    selectedRoutine === pill.value
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}

              {/* Has Available Room Toggle Pill */}
              <button
                type="button"
                onClick={() => setHasRoomOnly(!hasRoomOnly)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shadow-xs ml-1 ${
                  hasRoomOnly
                    ? "bg-purple-700 text-white ring-2 ring-purple-300"
                    : "bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100"
                }`}
              >
                <span>🏠</span>
                <span>Has Available Room</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    hasRoomOnly ? "bg-white text-purple-900" : "bg-purple-200 text-purple-800"
                  }`}
                >
                  {candidates.filter((c) => Boolean(c.active_room_share)).length}
                </span>
              </button>
            </div>

            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Candidate Results Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500">
              Running multi-dimensional compatibility engine...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center space-y-2">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchCandidates}
              className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
              👥
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Roommates Match Current Filters</h3>
            <p className="text-xs text-slate-500">
              Try lowering the minimum match score or widening the budget limit to see more candidates.
            </p>
            <button
              onClick={resetFilters}
              className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-indigo-700 transition"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map((c) => (
              <div
                key={c.user_id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header & Bio */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                        {c.avatar_url ? (
                          <img
                            src={c.avatar_url}
                            alt={c.full_name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          c.full_name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                          {c.full_name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {c.occupation || "Young Professional"} · {c.city || "Pune, Maharashtra"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Compatibility Badge */}
                  <div className="pt-1">
                    <CompatibilityScoreBadge score={c.compatibility_score} size="md" />
                  </div>

                  {/* Bio */}
                  {c.bio && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      &ldquo;{c.bio}&rdquo;
                    </p>
                  )}

                  {/* Lifestyle Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                      ☀️ {c.lifestyle?.sleep_schedule?.replace("_", " ") || "Flexible"}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                      🧹 Clean: {c.lifestyle?.cleanliness_level || 3}/5
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                      🔇 {c.lifestyle?.noise_tolerance?.replace("_", " ") || "Moderate"}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                      💰 ₹{c.lifestyle?.budget_min?.toLocaleString("en-IN") || "5,000"} - ₹{c.lifestyle?.budget_max?.toLocaleString("en-IN") || "15,000"}
                    </span>
                  </div>

                  {/* Top Strengths Preview */}
                  {c.strengths?.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Key Alignment
                      </p>
                      <div className="space-y-1">
                        {c.strengths.slice(0, 2).map((str, idx) => (
                          <p key={idx} className="text-xs text-emerald-900 flex items-start space-x-1.5">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span className="line-clamp-1">{str}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Space-Share Room Card Launcher */}
                  {c.active_room_share && (
                    <div className="pt-2">
                      <Link
                        href={`/rooms/${c.active_room_share.room_id}`}
                        className="block p-3 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 text-purple-950 transition-all group/share shadow-xs"
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-purple-800">
                            <span>🏠</span> Has an available bed in {c.active_room_share.neighborhood ? `${c.active_room_share.neighborhood}, ` : ""}{c.active_room_share.city}
                          </span>
                          <span className="text-purple-700 font-extrabold group-hover/share:translate-x-0.5 transition-transform">
                            View Room &rarr;
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-[11px] text-purple-700">
                          <span className="truncate max-w-[190px] font-medium">{c.active_room_share.title}</span>
                          <span className="font-extrabold text-purple-900 bg-white/80 px-2 py-0.5 rounded-md border border-purple-100">
                            ₹{c.active_room_share.rent_amount?.toLocaleString("en-IN")}/mo
                          </span>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Ranked #{filteredCandidates.indexOf(c) + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveModalCandidate(c)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition"
                  >
                    View Match Breakdown
                  </button>
                </div>
              </div>
            ))}

            {/* In-Grid Upgrade Message Card for Free Users after first 2 matches */}
            {showUpgradePrompt && filteredCandidates.length >= 2 && (
              <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 rounded-2xl border-2 border-indigo-500/40 p-6 shadow-xl flex flex-col justify-between text-white relative overflow-hidden group">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 border border-amber-300/30 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider">
                    <span>⭐ Premium Feature</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-white">
                      Unlock All Roommate Matches
                    </h3>
                    <p className="text-xs text-indigo-200 mt-1.5 leading-relaxed">
                      You have reached the free tier limit of 2 roommate matches. Upgrade to Pro Seeker to browse all {totalMatches ? `${totalMatches}+` : "eligible"} verified roommate profiles, unlock detailed compatibility breakdowns, and connect directly!
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-indigo-100">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Unlimited roommate matching profiles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Deep 8-dimension lifestyle breakdown</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Direct chat & space-share inquiries</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <Link
                    href="/pricing"
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition transform group-hover:scale-[1.02]"
                  >
                    Upgrade to Pro Seeker &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upgrade Banner for Free Tier Users */}
        {showUpgradePrompt && (
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold">
                <span>🔒 Free Tier Limit: 2 Matches</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Want to unlock all compatible roommates in Pune?
              </h3>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                Free accounts can access a maximum of 2 compatible roommate profiles. Premium subscribers get unlimited access to all eligible matches across Pune and in-depth compatibility breakdowns.
              </p>
            </div>
            <Link
              href="/pricing"
              className="shrink-0 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              View Subscription Plans &rarr;
            </Link>
          </div>
        )}

        {/* Match Breakdown Modal */}
        {activeModalCandidate && (
          <MatchExplanationModal
            candidateId={activeModalCandidate.user_id}
            candidateName={activeModalCandidate.full_name}
            initialScore={activeModalCandidate.compatibility_score}
            onClose={() => setActiveModalCandidate(null)}
          />
        )}
      </div>
    </div>
  );
}

export default function RoommatesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <RoommatesContent />
    </Suspense>
  );
}
