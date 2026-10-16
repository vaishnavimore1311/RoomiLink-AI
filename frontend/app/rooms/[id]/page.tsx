"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RoomListing } from "@/types/room";
import { SubscriptionPlan } from "@/types/subscription";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import RazorpayPaymentModal from "@/components/RazorpayPaymentModal";

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

  // Paywall & Razorpay Modal States
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [proSeekerPlan, setProSeekerPlan] = useState<SubscriptionPlan | null>(null);
  const [unlockedJustNow, setUnlockedJustNow] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomId) return;
      setIsLoading(true);
      try {
        const res = await apiRequest<{ data: RoomListing }>(`/rooms/${roomId}`, {
          requiresAuth: false,
        });
        if (res.data?.data) {
          setRoom(res.data.data);
        } else {
          setError(res.error || "Room listing not found.");
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load room details.");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchPlans = async () => {
      try {
        const res = await apiRequest<{ data: SubscriptionPlan[] }>("/subscriptions/plans?role=seeker", {
          requiresAuth: false,
        });
        if (res.data?.data) {
          const proPlan = res.data.data.find((p) => p.slug === "pro_seeker");
          if (proPlan) setProSeekerPlan(proPlan);
        }
      } catch (e) {
        console.error("Failed to load subscription plans:", e);
      }
    };

    fetchRoom();
    fetchPlans();
  }, [roomId]);

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
            <div className="absolute top-4 right-4 px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-md text-slate-900 font-extrabold text-sm">
              ₹{room.rent_amount?.toLocaleString("en-IN")} <span className="text-xs text-slate-500 font-normal">/ month</span>
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
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {room.title}
                </h1>
                <p className="text-sm text-slate-500 mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {room.address}, {room.neighborhood ? `${room.neighborhood}, ` : ""}{room.city}
                </p>
              </div>

              {/* Specs Bar */}
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
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-indigo-100">
                  {room.lister_name?.charAt(0) || "H"}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{room.lister_name}</h3>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified Host
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Monthly Rent:</span>
                  <span className="font-bold text-slate-900">₹{room.rent_amount?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Security Deposit:</span>
                  <span className="font-bold text-slate-900">₹{room.deposit_amount?.toLocaleString("en-IN")}</span>
                </div>
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
                    <span>✉️</span>
                    <span>Contact Host / Send Inquiry</span>
                  </>
                ) : (
                  <>
                    <span>🔒</span>
                    <span>Contact Host (Unlock with Pro)</span>
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
                <h3 className="font-extrabold text-lg text-slate-900">Message {room.lister_name}</h3>
                <p className="text-[11px] text-slate-500">Direct Priority Inquiry for {room.title}</p>
              </div>
              <button
                onClick={() => setShowInquiryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
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
                  {room.lister_name} has received your direct message and verified contact details.
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
                    placeholder={`Hi ${room.lister_name}, I am interested in viewing this room. I work hybrid in Pune and would like to schedule a viewing...`}
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
                      <span>Send Message &rarr;</span>
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
          setShowInquiryModal(true);
        }}
      />

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
