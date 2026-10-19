"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import { RoomInquiry } from "@/types/room";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const initialTab = searchParams.get("tab") === "inquiries" ? "inbox" : "overview";
  const [activeTab, setActiveTab] = useState<"overview" | "inbox">(initialTab);
  const [inboxSubTab, setInboxSubTab] = useState<"received" | "sent">("received");

  // Inquiries State
  const [receivedInquiries, setReceivedInquiries] = useState<RoomInquiry[]>([]);
  const [sentInquiries, setSentInquiries] = useState<RoomInquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiriesError, setInquiriesError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "replied">("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchInquiries = useCallback(async () => {
    if (!isAuthenticated) return;
    setInquiriesLoading(true);
    setInquiriesError(null);
    try {
      const [resReceived, resSent] = await Promise.all([
        apiRequest<{ data: RoomInquiry[] }>("/rooms/inquiries/received", { requiresAuth: true }),
        apiRequest<{ data: RoomInquiry[] }>("/rooms/inquiries/sent", { requiresAuth: true })
      ]);

      if (resReceived.data?.data) {
        setReceivedInquiries(resReceived.data.data);
      }
      if (resSent.data?.data) {
        setSentInquiries(resSent.data.data);
      }
    } catch (err: any) {
      setInquiriesError(err?.message || "Failed to load inquiries.");
    } finally {
      setInquiriesLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInquiries();
    }
  }, [isAuthenticated, fetchInquiries]);

  const handleUpdateStatus = async (inquiryId: number, newStatus: "pending" | "replied" | "archived") => {
    setUpdatingId(inquiryId);
    try {
      const res = await apiRequest<{ data: RoomInquiry }>(`/rooms/inquiries/${inquiryId}/status`, {
        method: "PATCH",
        requiresAuth: true,
        body: { status: newStatus }
      });

      if (res.data?.data) {
        setReceivedInquiries((prev) =>
          prev.map((inq) => (inq.id === inquiryId ? { ...inq, status: newStatus } : inq))
        );
      }
    } catch (err) {
      console.error("Failed to update inquiry status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const profile = user.profile;
  const pref = user.preference;

  const pendingReceivedCount = receivedInquiries.filter((inq) => inq.status === "pending").length;

  const filteredReceived = receivedInquiries.filter((inq) => {
    if (filterStatus === "all") return inq.status !== "archived";
    return inq.status === filterStatus;
  });

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
                {user.role === "admin" && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-700">
                    Admin
                  </span>
                )}
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

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            🏠 Overview &amp; Lifestyle
          </button>
          <button
            onClick={() => setActiveTab("inbox")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "inbox"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>📬 Inquiries Inbox</span>
            {pendingReceivedCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                activeTab === "inbox" ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
              }`}>
                {pendingReceivedCount}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
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
        )}

        {/* TAB 2: INQUIRIES INBOX */}
        {activeTab === "inbox" && (
          <div className="space-y-6">
            {/* Inbox Header & Subtabs */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Room Inquiries &amp; Host Messages</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct communication channels between verified property hosts and prospective seekers.
                </p>
              </div>

              {/* Subtab Segmented Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setInboxSubTab("received")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    inboxSubTab === "received"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Received as Host ({receivedInquiries.length})
                </button>
                <button
                  onClick={() => setInboxSubTab("sent")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    inboxSubTab === "sent"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sent as Seeker ({sentInquiries.length})
                </button>
              </div>
            </div>

            {/* SUBTAB: RECEIVED INQUIRIES */}
            {inboxSubTab === "received" && (
              <div className="space-y-4">
                {/* Filter Pills */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold mr-1">Filter:</span>
                  {(["all", "pending", "replied"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                        filterStatus === st
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {st} {st === "pending" ? `(${pendingReceivedCount})` : ""}
                    </button>
                  ))}
                  <button
                    onClick={fetchInquiries}
                    className="ml-auto text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>🔄</span> Refresh Inbox
                  </button>
                </div>

                {inquiriesLoading ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs text-slate-500">Checking for prospective seeker inquiries...</p>
                  </div>
                ) : filteredReceived.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-xl">
                      📬
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">No Inquiries Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {filterStatus !== "all"
                        ? `You have no inquiries with status '${filterStatus}'.`
                        : "When seekers browse your room listings and send inquiries, their messages and contact profiles will appear here."}
                    </p>
                    <Link
                      href="/rooms/new"
                      className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
                    >
                      Post Another Room
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredReceived.map((inq) => (
                      <div
                        key={inq.id}
                        className={`bg-white rounded-2xl p-5 border transition-all shadow-xs ${
                          inq.status === "pending"
                            ? "border-indigo-200 ring-1 ring-indigo-100"
                            : "border-slate-200/80"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Inquiry for Listing:
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">{inq.room_title}</h4>
                            <p className="text-xs text-slate-500">
                              {inq.room_neighborhood ? `${inq.room_neighborhood}, ` : ""}{inq.room_city} &bull; ₹{inq.room_rent?.toLocaleString("en-IN")}/mo
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {inq.is_priority && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                <span>⚡</span> Pro Seeker
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                inq.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : inq.status === "replied"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {inq.status}
                            </span>
                          </div>
                        </div>

                        {/* Seeker Info & Message Body */}
                        <div className="py-4 flex flex-col md:flex-row gap-4">
                          <div className="flex items-center space-x-3 md:w-1/3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                              {inq.sender_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{inq.sender_name}</p>
                              <p className="text-[11px] text-slate-500">{inq.sender_occupation || "Verified Seeker"}</p>
                              <p className="text-[11px] font-mono text-indigo-600">{inq.sender_email}</p>
                            </div>
                          </div>

                          <div className="flex-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                              Message:
                            </p>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                              &ldquo;{inq.message}&rdquo;
                            </p>
                            <span className="text-[10px] text-slate-400 mt-2 block">
                              Sent on {new Date(inq.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                          </div>
                        </div>

                        {/* Host Action Buttons */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">
                            Reply directly to the seeker via email or WhatsApp
                          </span>

                          <div className="flex items-center gap-2">
                            <a
                              href={`mailto:${inq.sender_email}?subject=${encodeURIComponent(`Regarding your inquiry for ${inq.room_title}`)}&body=${encodeURIComponent(`Hi ${inq.sender_name},\n\nThank you for reaching out regarding ${inq.room_title}.\n\n`)}`}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                            >
                              ✉️ Email Seeker
                            </a>
                            {inq.status === "pending" ? (
                              <button
                                onClick={() => handleUpdateStatus(inq.id, "replied")}
                                disabled={updatingId === inq.id}
                                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition"
                              >
                                {updatingId === inq.id ? "Updating..." : "✓ Mark as Replied"}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(inq.id, "pending")}
                                disabled={updatingId === inq.id}
                                className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold rounded-lg transition"
                              >
                                Reopen
                              </button>
                            )}
                            <button
                              onClick={() => handleUpdateStatus(inq.id, "archived")}
                              disabled={updatingId === inq.id}
                              className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 text-xs font-medium"
                            >
                              Archive
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB: SENT INQUIRIES */}
            {inboxSubTab === "sent" && (
              <div className="space-y-4">
                {inquiriesLoading ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs text-slate-500">Loading your sent inquiries...</p>
                  </div>
                ) : sentInquiries.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
                    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl mx-auto flex items-center justify-center text-xl">
                      🔍
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">No Sent Inquiries</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      You haven&apos;t sent any inquiries to room hosts yet. When you browse rooms and click &quot;Contact Host&quot;, you can track your conversations here.
                    </p>
                    <Link
                      href="/rooms"
                      className="inline-block mt-2 px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl hover:bg-teal-700 transition"
                    >
                      Browse Available Rooms
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {sentInquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Inquiry Sent For:
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">{inq.room_title}</h4>
                            <p className="text-xs text-slate-500">
                              {inq.room_city} &bull; ₹{inq.room_rent?.toLocaleString("en-IN")}/mo
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                inq.status === "replied"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {inq.status === "replied" ? "Host Replied" : "Awaiting Host Reply"}
                            </span>
                            <Link
                              href={`/rooms/${inq.room_id}`}
                              className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition"
                            >
                              View Room Listing &rarr;
                            </Link>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Your Message:
                          </p>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            &ldquo;{inq.message}&rdquo;
                          </p>
                          <span className="text-[10px] text-slate-400 mt-2 block">
                            Sent on {new Date(inq.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
