"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { SubscriberRecord } from "@/types/subscription";

export default function AdminSubscriptionsPage() {
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual Grant State
  const [grantEmail, setGrantEmail] = useState("");
  const [grantPlan, setGrantPlan] = useState("pro_seeker");
  const [grantDays, setGrantDays] = useState(30);
  const [isGranting, setIsGranting] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: SubscriberRecord[] }>("/admin/subscriptions", {
        requiresAuth: true,
      });
      if (res.data?.data) {
        setSubscribers(res.data.data);
      } else {
        setError(res.error || "Failed to load subscriptions.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch subscriptions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;

    setIsGranting(true);
    setError(null);
    try {
      const res = await apiRequest("/admin/subscriptions/grant", {
        method: "POST",
        requiresAuth: true,
        body: {
          email: grantEmail.trim(),
          plan_slug: grantPlan,
          days: Number(grantDays),
        },
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg(`VIP Plan granted to ${grantEmail} successfully!`);
        setGrantEmail("");
        fetchSubscriptions();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to grant subscription.");
    } finally {
      setIsGranting(false);
    }
  };

  const activeCount = subscribers.filter((s) => s.is_active).length;
  const mrr = subscribers
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + (s.price_inr || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Subscriptions &amp; Revenue Ledger
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor paying Seekers &amp; Property Hosts, track recurring MRR, or grant complimentary VIP tiers.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs">
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Metric Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Active Subscriptions
          </span>
          <span className="text-3xl font-black text-purple-400 mt-2 block">
            {isLoading ? "..." : activeCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across Pro Seeker and Featured Host plans
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Monthly Recurring Revenue (MRR)
          </span>
          <span className="text-3xl font-black text-amber-400 mt-2 block">
            {isLoading ? "..." : `₹${mrr.toLocaleString("en-IN")}`}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Active annualized rate: ₹{(mrr * 12).toLocaleString("en-IN")}/yr
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Available Tier Slugs
          </span>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono">
              pro_seeker (₹499)
            </span>
            <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 text-[10px] font-mono">
              featured_host (₹999)
            </span>
          </div>
        </div>
      </div>

      {/* Manual Grant Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>🎁</span> Complimentary VIP Override
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Manually grant any user an active subscription tier without requiring payment processing.
        </p>

        <form onSubmit={handleGrant} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              User Email Address
            </label>
            <input
              type="email"
              required
              placeholder="e.g. priya@example.com"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="w-full sm:w-48">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Plan
            </label>
            <select
              value={grantPlan}
              onChange={(e) => setGrantPlan(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="pro_seeker">Pro Seeker (₹499)</option>
              <option value="featured_host">Featured Host (₹999)</option>
            </select>
          </div>

          <div className="w-full sm:w-28">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Duration
            </label>
            <select
              value={grantDays}
              onChange={(e) => setGrantDays(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={365}>1 Year</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isGranting}
            className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 shrink-0"
          >
            {isGranting ? "Granting..." : "Grant Plan"}
          </button>
        </form>
      </div>

      {/* Subscriber Records Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-bold text-xs text-white uppercase tracking-wider">
            All Subscriber Records ({subscribers.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading subscribers...
          </div>
        ) : subscribers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No active subscriber records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/50">
                  <th className="py-3 px-4">Subscriber</th>
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expires At</th>
                  <th className="py-3 px-4">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{sub.user_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{sub.user_email}</p>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {sub.plan_name}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      ₹{sub.price_inr.toLocaleString("en-IN")}/mo
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.is_active
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {sub.is_active ? "● Active" : sub.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "Never"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[10px] truncate max-w-xs">
                      {sub.payment_reference || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
