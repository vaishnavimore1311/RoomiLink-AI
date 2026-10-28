"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RoomListing } from "@/types/room";
import { SubscriptionPlan } from "@/types/subscription";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import RazorpayPaymentModal from "@/components/RazorpayPaymentModal";
import MatchExplanationModal from "@/components/MatchExplanationModal";

function RoomDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const roomId = params?.id;

  const isProSubscriber =
    user?.role === "admin" || (user as any)?.subscription?.is_active === true;

  const [room, setRoom] = useState<RoomListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);

  // Paywall, Razorpay & Match Modal States
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [proSeekerPlan, setProSeekerPlan] = useState<SubscriptionPlan | null>(null);
  const [unlockedJustNow, setUnlockedJustNow] = useState(false);

  // Favorites State
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteToast, setFavoriteToast] = useState<{ message: string; type: "add" | "remove" } | null>(null);

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const res = await apiRequest<{ data: RoomListing }>(`/rooms/${roomId}`);
      if (res.data?.data) {
        setRoom(res.data.data);

        // Check if favorited from API or localStorage
        let fav = Boolean(res.data.data.is_favorited);
        if (!fav && typeof window !== "undefined") {
          try {
            const local = JSON.parse(localStorage.getItem("roomilink_local_favorites") || "[]");
            if (Array.isArray(local) && local.includes(Number(roomId))) {
              fav = true;
            }
          } catch (e) {}
        }
        setIsFavorited(fav);
      } else {
        setError(res.error || "Room listing not found.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load room details.");
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();

    const fetchPlans = async () => {
      try {
        const res = await apiRequest<{ data: SubscriptionPlan[] }>("/subscriptions/plans?role=seeker");
        if (res.data?.data) {
          const proPlan = res.data.data.find((p) => p.slug === "pro_seeker");
          if (proPlan) setProSeekerPlan(proPlan);
        }
      } catch (e) {
        console.error("Failed to load subscription plans:", e);
      }
    };

    fetchPlans();
  }, [fetchRoom]);

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryMessage.trim()) return;

    setIsSendingInquiry(true);
    setInquiryError(null);

    try {
      const res = await apiRequest(`/rooms/${roomId}/inquiry`, {
        method: "POST",
        requiresAuth: true,
        body: { message: inquiryMessage.trim() },
      });

      if (res.error) {
        if (res.data?.code === "SUBSCRIPTION_REQUIRED") {
          setShowInquiryModal(false);
          setShowPaywallModal(true);
        } else {
          setInquiryError(res.error);
        }
      } else {
        setInquirySent(true);
        setTimeout(() => {
          setShowInquiryModal(false);
          setInquirySent(false);
          setInquiryMessage("");
        }, 2200);
      }
    } catch (err: any) {
      setInquiryError(err.message || "Failed to deliver inquiry message.");
    } finally {
      setIsSendingInquiry(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!roomId) return;
    const nextState = !isFavorited;
    setIsFavorited(nextState);

    // Update localStorage
    if (typeof window !== "undefined") {
      try {
        const stored: number[] = JSON.parse(localStorage.getItem("roomilink_local_favorites") || "[]");
        const set = new Set(stored);
        if (nextState) set.add(Number(roomId));
        else set.delete(Number(roomId));
        localStorage.setItem("roomilink_local_favorites", JSON.stringify(Array.from(set)));
      } catch (e) {}
    }

    if (isAuthenticated) {
      try {
        const res = await apiRequest<{ is_favorited: boolean; message: string }>(`/rooms/${roomId}/favorite`, {
          method: "POST",
          requiresAuth: true
        });
        if (res.data) {
          setFavoriteToast({
            message: res.data.is_favorited ? "Saved to your favorites! ❤️" : "Removed from saved rooms.",
            type: res.data.is_favorited ? "add" : "remove"
          });
        }
      } catch (err) {
        console.error("Favorite toggle error:", err);
      }
    } else {
      setFavoriteToast({
        message: nextState ? "Room saved locally! Sign in to sync across devices. ❤️" : "Removed from saved rooms.",
        type: nextState ? "add" : "remove"
      });
    }

    setTimeout(() => {
      setFavoriteToast(null);
    }, 2800);
  };


  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading room specifications...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Room Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">{error || "This listing may have been removed or deactivated."}</p>
        <Link
          href="/rooms"
          className="mt-6 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
        >
          &larr; Back to all rooms
        </Link>
      </div>
    );
  }

  const images = room.images && room.images.length > 0
    ? room.images
    : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Link href="/rooms" className="hover:text-indigo-600 transition-colors font-medium">
            &larr; All Rooms
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">{room.city}</span>
          <span>/</span>
          <span className="truncate max-w-[200px]">{room.title}</span>
        </div>

        {/* Photo Showcase Gallery */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm p-4 space-y-3">
          <div className="relative h-[320px] sm:h-[440px] rounded-2xl overflow-hidden bg-slate-100">
            <img
              src={images[activeImageIndex] || images[0]}
              alt={room.title}
              className="w-full h-full object-cover transition-all duration-300"
            />
            {/* Top-Left Heart Button */}
            <button
              type="button"
              onClick={handleToggleFavorite}
              title={isFavorited ? "Remove from saved rooms" : "Save this room"}
              className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center shadow-md backdrop-blur-md transition-all active:scale-90 z-20 ${
                isFavorited
                  ? "bg-rose-500 text-white scale-105"
                  : "bg-white/85 text-slate-700 hover:text-rose-500 hover:bg-white"
              }`}
            >
              <svg
                className="w-5 h-5 transition-transform duration-200"
                fill={isFavorited ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
            <div className="absolute top-4 right-4 px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-md text-slate-900 font-extrabold text-sm text-right">
              <div>
                ₹{room.rent_amount?.toLocaleString("en-IN")}{" "}
                <span className="text-xs text-slate-500 font-normal">
                  {room.listing_purpose === "flatmate_share" ? "/ mo (Split)" : "/ month"}
                </span>
              </div>
              {room.listing_purpose === "flatmate_share" && (
                <div className="text-[10px] font-bold text-purple-700">
                  Total Rent: ₹{(room.total_room_rent || (room.rent_amount || 0) * (room.max_occupants || 2)).toLocaleString("en-IN")} • {Math.round(100 / (room.max_occupants || 2))}% Split
                </div>
              )}
            </div>
            <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold capitalize">
              {room.room_type} Room &bull; {room.property_type}
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`h-20 w-28 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    activeImageIndex === idx ? "border-indigo-600 ring-2 ring-indigo-200" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info (2 Cols) */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {room.listing_purpose === "flatmate_share" && (
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-900 border border-purple-200 shadow-xs">
                          <span>🤝</span> Flatmate Room-Share &bull; Splitting Rent &amp; Bills
                        </span>
                        {room.preferred_gender && room.preferred_gender !== "any" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200">
                            {room.preferred_gender === "female" ? "♀ Female Flatmate Preferred" : "♂ Male Flatmate Preferred"}
                          </span>
                        )}
                      </div>
                    )}
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {room.title}
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border shrink-0 active:scale-95 ${
                      isFavorited
                        ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-rose-600"
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isFavorited ? "scale-110 text-rose-500 fill-rose-500" : "text-slate-400"}`}
                      fill={isFavorited ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span>{isFavorited ? "Saved" : "Save Room"}</span>
                  </button>
                </div>
                {room.is_address_locked ? (
                  <div className="mt-2 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-slate-600 font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{room.neighborhood ? `${room.neighborhood}, ` : ""}{room.city}</span>
                      </p>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                        <span>🔒</span> Exact Address Locked
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/70 via-indigo-50/40 to-slate-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm shrink-0">
                          🔒
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Exact Street Address Hidden</p>
                          <p className="text-[11px] text-slate-600">Full street address &amp; building number are visible to subscribed members only.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAuthenticated) {
                            router.push(`/login?redirect=${encodeURIComponent(`/rooms/${roomId}`)}`);
                          } else {
                            setShowPaywallModal(true);
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-100 transition-all active:scale-95 shrink-0"
                      >
                        Unlock Full Address &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-slate-600 font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{room.neighborhood ? `${room.neighborhood}, ` : ""}{room.city}</span>
                      </p>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span>✓</span> Exact Address Unlocked
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-semibold pl-5">
                      📍 {room.address}
                    </p>
                  </div>
                )}
              </div>

              {/* Specs Bar */}
              {room.listing_purpose === "flatmate_share" ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100 text-center">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase">Room Type</span>
                    <p className="text-sm font-bold text-slate-800 capitalize mt-0.5">{room.room_type}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase">Occupancy</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {room.current_occupants || 1} / {room.max_occupants || 2} Beds ({Math.max(1, (room.max_occupants || 2) - (room.current_occupants || 1))} Open)
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase">Deposit Share</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">₹{(room.deposit_amount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase">Move-In</span>
                    <p className="text-sm font-bold text-emerald-600 mt-0.5">{room.available_from || "Immediate"}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 py-4 border-y border-slate-100 text-center">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase">Room Type</span>
                    <p className="text-sm font-bold text-slate-800 capitalize mt-0.5">{room.room_type}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase">Deposit</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">₹{(room.deposit_amount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase">Availability</span>
                    <p className="text-sm font-bold text-emerald-600 mt-0.5">{room.available_from || "Immediate"}</p>
                  </div>
                </div>
              )}

              {/* Utility & Bill Split Details (Flatmate Share) */}
              {room.listing_purpose === "flatmate_share" && room.utility_split_desc && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
                  <span className="text-base shrink-0">💡</span>
                  <div>
                    <span className="font-bold text-indigo-950">Domestic Bills &amp; Rent Split Terms:</span>
                    <p className="text-indigo-800 mt-0.5">{room.utility_split_desc}</p>
                  </div>
                </div>
              )}

              {/* Meet Your Future Roommate Card (Flatmate Room-Share Exclusive) */}
              {room.listing_purpose === "flatmate_share" && room.existing_flatmate && (
                <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-7 shadow-xl shadow-indigo-950/20 border border-indigo-800/60 relative overflow-hidden space-y-6">
                  {/* Decorative background glow */}
                  <div className="absolute -top-16 -right-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 mb-2">
                        <span>🤝</span> Resident Flatmate Profile
                      </div>
                      <h2 className="text-xl font-black tracking-tight text-white">
                        Meet Your Future Roommate
                      </h2>
                      <p className="text-xs text-indigo-200/80 mt-0.5">
                        You&apos;ll be sharing this flat with {room.existing_flatmate.name}. Review their lifestyle and AI compatibility.
                      </p>
                    </div>

                    {/* Live AI Compatibility Badge */}
                    {room.existing_flatmate.compatibility_score !== undefined && room.existing_flatmate.compatibility_score !== null ? (
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center sm:text-right shrink-0">
                        <div className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-200">
                          AI Compatibility
                        </div>
                        <div className="text-2xl font-black text-emerald-400 flex items-center justify-center sm:justify-end gap-1">
                          <span>{room.existing_flatmate.compatibility_score}%</span>
                          <span className="text-xs font-bold text-emerald-300">Match</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-2 text-center text-xs text-indigo-200 shrink-0">
                        Sign in to view match score
                      </div>
                    )}
                  </div>

                  {/* Profile Card Summary */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-900/50 shrink-0">
                      {room.existing_flatmate.avatar_url ? (
                        <img src={room.existing_flatmate.avatar_url} alt={room.existing_flatmate.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        room.existing_flatmate.name.charAt(0)
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white">{room.existing_flatmate.name}</h3>
                        {room.existing_flatmate.is_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span>✓</span> Verified ID
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-indigo-200">
                          Current Tenant
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200 font-medium">
                        {room.existing_flatmate.occupation || "Working Professional"} &bull; {room.existing_flatmate.city || room.city}
                      </p>
                      {room.existing_flatmate.bio && (
                        <p className="text-xs text-indigo-100/90 italic leading-relaxed pt-1">
                          &ldquo;{room.existing_flatmate.bio}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lifestyle & Habit Badges */}
                  <div className="space-y-2 relative z-10">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                      Living Habits &amp; Daily Rhythm
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {room.existing_flatmate.sleep_schedule && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs">
                          <span className="text-indigo-300 block text-[10px] uppercase font-bold">Sleep Schedule</span>
                          <span className="font-semibold text-white capitalize mt-0.5 block truncate">
                            🌙 {room.existing_flatmate.sleep_schedule.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}
                      {room.existing_flatmate.cleanliness && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs">
                          <span className="text-indigo-300 block text-[10px] uppercase font-bold">Cleanliness</span>
                          <span className="font-semibold text-white capitalize mt-0.5 block truncate">
                            🧹 {room.existing_flatmate.cleanliness.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}
                      {room.existing_flatmate.noise_tolerance && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs">
                          <span className="text-indigo-300 block text-[10px] uppercase font-bold">Noise Level</span>
                          <span className="font-semibold text-white capitalize mt-0.5 block truncate">
                            🎧 {room.existing_flatmate.noise_tolerance.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}
                      {room.existing_flatmate.guest_frequency && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs">
                          <span className="text-indigo-300 block text-[10px] uppercase font-bold">Guest Policy</span>
                          <span className="font-semibold text-white capitalize mt-0.5 block truncate">
                            👥 {room.existing_flatmate.guest_frequency.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Compatibility Breakdown Bar & Strengths */}
                  {room.existing_flatmate.compatibility_score !== undefined && room.existing_flatmate.compatibility_score !== null && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 relative z-10">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span>✨</span> Algorithmic Compatibility Index
                        </span>
                        <span className="font-bold text-emerald-300">
                          {room.existing_flatmate.compatibility_score}% Harmonious Match
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            room.existing_flatmate.compatibility_score >= 80
                              ? "bg-gradient-to-r from-emerald-400 to-teal-300"
                              : room.existing_flatmate.compatibility_score >= 60
                              ? "bg-gradient-to-r from-indigo-400 to-cyan-400"
                              : "bg-gradient-to-r from-amber-400 to-rose-400"
                          }`}
                          style={{ width: `${room.existing_flatmate.compatibility_score}%` }}
                        />
                      </div>

                      {/* Strengths Pills */}
                      {room.existing_flatmate.strengths && room.existing_flatmate.strengths.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-300">
                            Why you&apos;ll get along:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {room.existing_flatmate.strengths.map((str, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-emerald-200 text-[11px] font-medium"
                              >
                                ✓ {str}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Breakdown Modal Trigger */}
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowMatchModal(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer active:scale-95"
                        >
                          <span>📊 View 8-Factor Compatibility Breakdown</span>
                          <span>&rarr;</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <h2 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider">
                  About This Space
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {room.description || "No additional description provided by the host."}
                </p>
              </div>

              {/* Amenities */}
              <div>
                <h2 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">
                  Included Amenities
                </h2>
                {room.amenities && room.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {room.amenities.map((item) => (
                      <div
                        key={item}
                        className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium"
                      >
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[10px]">
                          ✓
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Standard utilities included.</p>
                )}
              </div>
            </div>
          </div>

          {/* Host & Inquiry Card (1 Col) */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5 sticky top-24">
              <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-indigo-100 shrink-0">
                  {room.listing_purpose === "flatmate_share" && room.existing_flatmate
                    ? room.existing_flatmate.name.charAt(0)
                    : room.lister_name?.charAt(0) || "H"}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {room.listing_purpose === "flatmate_share" && room.existing_flatmate
                      ? room.existing_flatmate.name
                      : room.lister_name}
                  </h3>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {room.listing_purpose === "flatmate_share" ? "Resident Flatmate" : "Verified Host"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                {room.listing_purpose === "flatmate_share" && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="font-medium text-slate-500">Total Actual Room Rent:</span>
                    <span className="font-bold text-slate-800">
                      ₹{(room.total_room_rent || (room.rent_amount || 0) * (room.max_occupants || 2)).toLocaleString("en-IN")} / mo
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>{room.listing_purpose === "flatmate_share" ? "Your Share of Rent:" : "Monthly Rent:"}</span>
                  <span className="font-bold text-emerald-700 text-sm">₹{room.rent_amount?.toLocaleString("en-IN")}{room.listing_purpose === "flatmate_share" ? " / mo" : ""}</span>
                </div>
                {room.listing_purpose === "flatmate_share" && (
                  <div className="text-[11px] font-medium text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/60">
                    ⚡ Equal split: ₹{(room.total_room_rent || (room.rent_amount || 0) * (room.max_occupants || 2)).toLocaleString("en-IN")} divided among {room.max_occupants || 2} flatmates ({Math.round(100 / (room.max_occupants || 2))}% each).
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{room.listing_purpose === "flatmate_share" ? "Your Share of Deposit:" : "Security Deposit:"}</span>
                  <span className="font-bold text-slate-900">₹{room.deposit_amount?.toLocaleString("en-IN")}</span>
                </div>
                {room.listing_purpose === "flatmate_share" && room.utility_split_desc && (
                  <div className="flex justify-between items-center text-indigo-900 bg-indigo-50/70 p-2.5 rounded-xl text-[11px]">
                    <span className="font-semibold shrink-0">Bills Split:</span>
                    <span className="font-bold text-right truncate max-w-[140px]" title={room.utility_split_desc}>{room.utility_split_desc}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Move-In Date:</span>
                  <span className="font-bold text-slate-900">{room.available_from}</span>
                </div>
              </div>

              {/* Subscription Status Tag */}
              {isProSubscriber ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Pro Seeker Active:</strong> Direct messaging &amp; priority contact unlocked.</span>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 text-xs text-indigo-900 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <span>🔒</span> Direct Host Contact
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold">
                      Pro Seeker
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Direct messaging is exclusively reserved for subscribed members.
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    router.push(`/login?redirect=${encodeURIComponent(`/rooms/${roomId}`)}`);
                  } else if (!isProSubscriber) {
                    setShowPaywallModal(true);
                  } else {
                    setShowInquiryModal(true);
                  }
                }}
                className={`w-full py-3.5 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  isProSubscriber
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-purple-200"
                }`}
              >
                {isProSubscriber ? (
                  <>
                    <span>{room.listing_purpose === "flatmate_share" ? "🤝" : "✉️"}</span>
                    <span>
                      {room.listing_purpose === "flatmate_share"
                        ? `Apply to Share Room with ${room.existing_flatmate?.name || room.lister_name}`
                        : "Contact Host / Send Inquiry"}
                    </span>
                  </>
                ) : (
                  <>
                    <span>🔒</span>
                    <span>
                      {room.listing_purpose === "flatmate_share"
                        ? `Apply to Share Room (Unlock with Pro)`
                        : "Contact Host (Unlock with Pro)"}
                    </span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Protected by RoomiLink AI verified listings policy. No brokerage fees.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pro Seeker Paywall Modal */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xl shadow-md shadow-indigo-200">
                🔒
              </div>
              <button
                onClick={() => setShowPaywallModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                ✨ Pro Seeker Member Perk
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Direct Host Messaging is Locked
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                To protect verified Pune landlords from spam and maintain trust, sending direct inquiries is exclusive to <strong>Pro Seeker</strong> subscribers.
              </p>
            </div>

            {/* Included Benefits */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                What you unlock today:
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Unlimited direct inquiries to {room.lister_name} &amp; all verified hosts</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Priority response badge &amp; verified trust verification</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Zero brokerage fees with direct viewing schedule</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>AI Living Agreement drafting &amp; roommate mediation tools</span>
              </div>
            </div>

            {/* Price & Razorpay Action */}
            <div className="space-y-3 pt-1">
              <div className="flex items-baseline justify-between px-1">
                <span className="text-xs text-slate-500 font-medium">Pro Seeker Membership:</span>
                <span className="text-lg font-black text-slate-900">
                  ₹499 <span className="text-xs font-normal text-slate-500">/ month</span>
                </span>
              </div>

              <button
                onClick={() => {
                  setShowPaywallModal(false);
                  setShowPaymentModal(true);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                <span>Unlock Direct Contact via Razorpay (₹499)</span>
              </button>

              <div className="text-center">
                <Link
                  href="/pricing"
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  View all membership plans &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Modal */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  {room.listing_purpose === "flatmate_share" && room.existing_flatmate
                    ? `Message ${room.existing_flatmate.name}`
                    : `Message ${room.lister_name}`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {room.listing_purpose === "flatmate_share"
                    ? `Direct Flatmate Room-Share Inquiry for ${room.title}`
                    : `Direct Priority Inquiry for ${room.title}`}
                </p>
              </div>
              <button
                onClick={() => setShowInquiryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {unlockedJustNow && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <span>🎉</span>
                <span>Pro Seeker Unlocked! You can now send direct inquiries.</span>
              </div>
            )}

            {inquiryError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {inquiryError}
              </div>
            )}

            {inquirySent ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2 animate-fadeIn">
                <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-800 mx-auto flex items-center justify-center font-bold">
                  ✓
                </div>
                <p className="font-bold text-sm">Inquiry Delivered Successfully!</p>
                <p className="text-xs text-emerald-600">
                  {room.listing_purpose === "flatmate_share" && room.existing_flatmate
                    ? `${room.existing_flatmate.name} has received your flatmate application and direct message.`
                    : `${room.lister_name} has received your direct message and verified contact details.`}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    placeholder={
                      room.listing_purpose === "flatmate_share"
                        ? `Hi ${room.existing_flatmate?.name || room.lister_name}, I'm interested in sharing this room with you! I think our daily schedules, cleanliness habits, and lifestyle will align really well.`
                        : `Hi ${room.lister_name}, I am interested in viewing this room. I work hybrid in Pune and would like to schedule a viewing...`
                    }
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInquiryModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingInquiry}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-2"
                  >
                    {isSendingInquiry ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>{room.listing_purpose === "flatmate_share" ? "Send Application \u2192" : "Send Message \u2192"}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Razorpay Interactive Checkout Modal */}
      <RazorpayPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        plan={
          proSeekerPlan || {
            id: 2,
            name: "Pro Seeker",
            slug: "pro_seeker",
            target_role: "seeker",
            price_inr: 499.0,
            billing_cycle: "monthly",
            features: [
              "Direct instant contact with roommates & landlords",
              "Unlimited AI match explanations",
              "Verified Seeker priority trust badge",
              "Generate & export official AI Living Agreements",
            ],
            is_active: true,
          }
        }
        onSuccess={async () => {
          await refreshUser();
          setUnlockedJustNow(true);
          setShowPaymentModal(false);
          await fetchRoom();
          setShowInquiryModal(true);
        }}
      />

      {/* 8-Factor Live Compatibility Breakdown Modal */}
      {showMatchModal && room.existing_flatmate && (
        <MatchExplanationModal
          candidateId={room.existing_flatmate.id}
          candidateName={room.existing_flatmate.name}
          initialScore={room.existing_flatmate.compatibility_score || 85}
          onClose={() => setShowMatchModal(false)}
        />
      )}

      {/* Toast Notification */}
      {favoriteToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold rounded-2xl shadow-2xl border border-slate-700/60 animate-bounce duration-300">
          <span>{favoriteToast.type === "add" ? "❤️" : "🤍"}</span>
          <span>{favoriteToast.message}</span>
        </div>
      )}

    </div>
  );
}

export default function RoomDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <RoomDetailContent />
    </Suspense>
  );
}
