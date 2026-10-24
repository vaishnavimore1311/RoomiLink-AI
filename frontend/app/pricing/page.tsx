"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import { SubscriptionPlan } from "@/types/subscription";
import RazorpayPaymentModal from "@/components/RazorpayPaymentModal";

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeTab, setActiveTab] = useState<"seeker" | "lister">("seeker");
  const [isLoading, setIsLoading] = useState(true);
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Razorpay Payment Modal State
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<SubscriptionPlan | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<{
    payment_id: string;
    order_id: string;
    amount_inr: number;
    method: string;
    paid_at: string;
    plan_name: string;
  } | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await apiRequest<{ data: SubscriptionPlan[] }>("/subscriptions/plans", {
          requiresAuth: false,
        });
        if (res.data?.data) {
          setPlans(res.data.data);
        }
      } catch (err: any) {
        console.error("Failed to load plans:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/pricing");
      return;
    }

    if (plan.price_inr === 0) {
      return;
    }

    setError(null);
    setSelectedPlanForPayment(plan);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async (receipt: {
    payment_id: string;
    order_id: string;
    amount_inr: number;
    method: string;
    paid_at: string;
    plan_name: string;
  }) => {
    setLastPaymentReceipt(receipt);
    setSuccessMessage(`Payment verified via Razorpay! You are now subscribed to ${receipt.plan_name}.`);
    await refreshUser();
  };

  const filteredPlans = plans.filter((p) => p.target_role === activeTab);
  const userActivePlanSlug = (user as any)?.subscription?.plan?.slug;

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span>✨</span> Transparent Pricing &bull; Cancel Anytime
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Elevate Your Shared Living Experience
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            Whether finding a harmonious room in Pune or listing verified co-living properties, choose the plan that unlocks deeper AI intelligence and priority trust.
          </p>

          {/* Role Tab Switcher */}
          <div className="inline-flex items-center bg-slate-200/80 p-1.5 rounded-2xl shadow-inner mt-4">
            <button
              onClick={() => setActiveTab("seeker")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "seeker"
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              For Room Seekers
            </button>
            <button
              onClick={() => setActiveTab("lister")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "lister"
                  ? "bg-white text-teal-700 shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              For Property Hosts &amp; Landlords
            </button>
          </div>
        </div>

        {reason === "household_join" && (
          <div className="max-w-2xl mx-auto p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs shadow-sm flex items-start space-x-3">
            <span className="text-xl leading-none mt-0.5">⭐</span>
            <div>
              <p className="font-bold text-sm text-amber-900 mb-0.5">Subscription Required to Join Household</p>
              <p className="text-amber-800 leading-relaxed">
                Joining a household workspace via invite code requires an active subscription. Choose a plan below to activate your account and start collaborating with your roommates.
              </p>
            </div>
          </div>
        )}

        {reason === "household_create" && (
          <div className="max-w-2xl mx-auto p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-950 text-xs shadow-sm flex items-start space-x-3">
            <span className="text-xl leading-none mt-0.5">🏠</span>
            <div>
              <p className="font-bold text-sm text-indigo-900 mb-0.5">Subscription Required to Create Workspace</p>
              <p className="text-indigo-800 leading-relaxed">
                Creating a shared household workspace requires an active subscription. Select a plan below to access expense splitting, weekly chore rotations, and AI living agreements.
              </p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="max-w-xl mx-auto p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold text-center shadow-sm">
            ✓ {successMessage}
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {isLoading ? (
            <div className="col-span-2 text-center py-16 text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading membership plans...
            </div>
          ) : (
            filteredPlans.map((plan) => {
              const isPopular = plan.price_inr > 0;
              const isCurrent = userActivePlanSlug === plan.slug;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl p-8 transition-all ${
                    isPopular
                      ? "bg-white border-2 border-indigo-600 shadow-xl shadow-indigo-100 ring-4 ring-indigo-50"
                      : "bg-white border border-slate-200 shadow-sm hover:shadow-md"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 right-6 px-3.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-md">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {plan.price_inr === 0
                        ? "Essential tools for finding rooms and getting started"
                        : "Full suite of AI matching, verified contacts, and priority placement"}
                    </p>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black text-slate-900">
                        {plan.price_inr === 0 ? "₹0" : `₹${plan.price_inr.toLocaleString("en-IN")}`}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">/ month</span>
                    </div>

                    <div className="mt-8 space-y-3">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Included Features:
                      </p>
                      <ul className="space-y-2.5">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                            <span className="text-emerald-600 font-bold text-sm shrink-0">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-3.5 px-4 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs cursor-default"
                      >
                        ✓ Current Active Plan
                      </button>
                    ) : plan.price_inr === 0 ? (
                      <Link
                        href="/rooms"
                        className="w-full py-3.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs text-center block transition-all"
                      >
                        Continue with Free Tier
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={subscribingSlug === plan.slug}
                        className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        {subscribingSlug === plan.slug
                          ? "Activating Plan..."
                          : `Upgrade to ${plan.name} &rarr;`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Security / FAQ footer */}
        <div className="text-center pt-8 border-t border-slate-200 text-xs text-slate-500 max-w-xl mx-auto space-y-2">
          <p className="font-semibold text-slate-700">🔒 Safe &amp; Secure Payments Powered by Razorpay</p>
          <p>
            Subscriptions can be cancelled at any time from your account settings without penalties. All prices include applicable taxes.
          </p>
          {lastPaymentReceipt && (
            <div className="pt-2">
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors text-xs"
              >
                <span>🧾</span> View Last Razorpay Receipt ({lastPaymentReceipt.payment_id})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Razorpay Interactive Checkout Modal */}
      <RazorpayPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        plan={selectedPlanForPayment}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}


