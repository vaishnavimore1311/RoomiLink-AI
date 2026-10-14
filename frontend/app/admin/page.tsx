"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { AdminStats } from "@/types/subscription";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);
      try {
        const res = await apiRequest<{ data: AdminStats }>("/admin/stats", {
          requiresAuth: true,
        });
        if (res.data?.data) {
          setStats(res.data.data);
        } else {
          setError(res.error || "Failed to load admin statistics.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to connect to admin server.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Admin Operations Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time control for Pune room inventory, subscriber monetization, and platform moderation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/rooms/new"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-900/40 transition-all flex items-center gap-2 active:scale-95"
          >
            <span>➕</span> Add Room in Pune
          </Link>
          <Link
            href="/admin/subscriptions"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
          >
            Subscribers &rarr;
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Users */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Community</span>
            <span className="text-lg">👥</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-white">
              {isLoading ? "..." : stats?.users.total ?? 0}
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
              <span className="text-indigo-400 font-semibold">{stats?.users.seekers ?? 0} Seekers</span>
              <span>&bull;</span>
              <span className="text-teal-400 font-semibold">{stats?.users.listers ?? 0} Listers</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pune Rooms */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pune City Inventory</span>
            <span className="text-lg">📍</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-emerald-400">
              {isLoading ? "..." : stats?.listings.pune_rooms ?? 0}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Out of <span className="text-white font-semibold">{stats?.listings.total_rooms ?? 0}</span> total room listings
            </div>
          </div>
        </div>

        {/* Card 3: Active Subscriptions */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Paid Subs</span>
            <span className="text-lg">💳</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-purple-400">
              {isLoading ? "..." : stats?.subscriptions.active_count ?? 0}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Pro Seekers &amp; Featured Hosts
            </div>
          </div>
        </div>

        {/* Card 4: Monthly Revenue */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Revenue (MRR)</span>
            <span className="text-lg">💰</span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-amber-400">
              {isLoading ? "..." : `₹${(stats?.subscriptions.total_revenue_inr ?? 0).toLocaleString("en-IN")}`}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Recurring subscription revenue
            </div>
          </div>
        </div>
      </div>

      {/* Pune Engine Overview Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-950 to-purple-950/60 border border-indigo-800/50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Focus City: Pune, Maharashtra
            </div>
            <h2 className="text-lg font-bold text-white">Pune Localities Currently Live in Directory</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Admins can immediately provision verified listings across IT corridors and university zones with pre-configured amenities and localized INR pricing benchmarks.
            </p>
          </div>

          <Link
            href="/admin/rooms/new"
            className="shrink-0 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            Create New Pune Listing &rarr;
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { name: "Hinjewadi", tag: "Phase 1/2/3 IT Techies", rent: "₹8,500/mo" },
            { name: "Baner", tag: "Balewadi High St & Cafes", rent: "₹14,500/mo" },
            { name: "Wakad", tag: "Gated Societies", rent: "₹9,200/mo" },
            { name: "Viman Nagar", tag: "Symbiosis & Airport", rent: "₹13,000/mo" },
            { name: "Kothrud", tag: "MIT / Paud Road", rent: "₹7,200/mo" },
            { name: "Kharadi", tag: "EON IT Park & WTC", rent: "₹11,800/mo" },
          ].map((loc) => (
            <div
              key={loc.name}
              className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs flex items-center gap-3"
            >
              <span className="font-bold text-white">{loc.name}</span>
              <span className="text-[10px] text-slate-400">{loc.tag}</span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40">
                Avg {loc.rent}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Operations Table / Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <span>🏠</span> Room Management
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Review live rooms, mark rooms as featured for top ranking in Pune, or delete expired properties.
          </p>
          <Link
            href="/admin/rooms"
            className="inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Browse all listings &rarr;
          </Link>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <span>💳</span> Subscriptions &amp; Tiers
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Monitor active Pro Seekers (₹499) and Featured Hosts (₹999). Manually grant VIP complimentary days.
          </p>
          <Link
            href="/admin/subscriptions"
            className="inline-block text-xs font-semibold text-purple-400 hover:text-purple-300"
          >
            Open Subscriber Ledger &rarr;
          </Link>
        </div>

        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <span>👥</span> User Governance
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Inspect registered community accounts, verify user trust scores, and promote staff members to admin.
          </p>
          <Link
            href="/admin/users"
            className="inline-block text-xs font-semibold text-teal-400 hover:text-teal-300"
          >
            Manage users &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
