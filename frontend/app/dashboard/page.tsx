"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const profile = user.profile;
  const pref = user.preference;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 text-white flex items-center justify-center text-2xl font-bold uppercase shadow-md shadow-indigo-100">
              {profile?.full_name?.charAt(0) || user.email.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Welcome back, {profile?.full_name || user.email.split("@")[0]}!
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {user.email} &bull; <span className="capitalize">{user.role}</span> &bull; {profile?.city || "City not set"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/onboarding"
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-xl border border-indigo-200 transition-colors"
            >
              Edit Preferences
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-rose-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Lifestyle Compatibility Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Lifestyle Profile</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your 8-factor everyday habits are active. Roommates can see your compatibility breakdown.
              </p>

              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-500">Sleep Schedule:</span>
                  <span className="font-semibold text-slate-800 capitalize">{pref?.sleep_schedule?.replace("_", " ") || "Flexible"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-500">Cleanliness:</span>
                  <span className="font-semibold text-slate-800">{pref?.cleanliness_level || 3} / 5</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-500">Budget Range:</span>
                  <span className="font-semibold text-slate-800">₹{(pref?.budget_min || 6000).toLocaleString("en-IN")} - ₹{(pref?.budget_max || 15000).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <Link
              href="/roommates"
              className="mt-6 w-full inline-flex justify-center items-center py-2 px-4 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-100"
            >
              Find Compatible Roommates &rarr;
            </Link>
          </div>

          {/* Room Discovery Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Find Rooms</h2>
              <p className="text-xs text-slate-500 mt-1">
                Explore verified accommodations filtered by budget, location, and desired amenities.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Quick Search:</span> Private rooms, shared apartments, and verified listers in {profile?.city || "your area"}.
              </div>
            </div>

            <Link
              href="/rooms"
              className="mt-6 w-full inline-flex justify-center items-center py-2 px-4 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm shadow-teal-100"
            >
              Browse Property Listings &rarr;
            </Link>
          </div>

          {/* Household Workspace Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Household Hub</h2>
              <p className="text-xs text-slate-500 mt-1">
                Coordinate everyday living: shared grocery expenses, bill splitting, and chore schedules.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">
                  {user.household_id ? "Active Household Member" : "Not yet in a household"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {user.household_id
                    ? "View who owes whom and check off weekly chores."
                    : "Create a shared home or join flatmates using an 8-character code."}
                </p>
              </div>
            </div>

            <Link
              href="/household"
              className="mt-6 w-full inline-flex justify-center items-center py-2 px-4 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              Enter Household Workspace &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
