"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import { AgreementData, AgreementClause } from "@/types/agreement";
import { HouseholdInfo, HouseholdMemberInfo } from "@/types/household";

function AgreementContent() {
  const { isAuthenticated, user } = useAuth();

  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [members, setMembers] = useState<HouseholdMemberInfo[]>([]);
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Clause Modal state
  const [editingClause, setEditingClause] = useState<AgreementClause | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isSavingClause, setIsSavingClause] = useState(false);

  // Signed status tracking (stored in localStorage or state)
  const [isSignedByMe, setIsSignedByMe] = useState(false);

  const fetchHouseholdAndAgreement = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const hhRes = await apiRequest<{
        data: { household: HouseholdInfo; members: HouseholdMemberInfo[] } | null;
      }>("/household/current", { requiresAuth: true });

      if (hhRes.data?.data) {
        setHousehold(hhRes.data.data.household);
        setMembers(hhRes.data.data.members);

        const hhId = hhRes.data.data.household.id;
        const agRes = await apiRequest<{ data: AgreementData | null }>(
          `/ai/agreement/${hhId}`,
          { requiresAuth: true }
        );

        if (agRes.data?.data) {
          setAgreement(agRes.data.data);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load agreement.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHouseholdAndAgreement();
  }, [fetchHouseholdAndAgreement]);

  // Generate Agreement handler
  const handleGenerateAgreement = async () => {
    if (!household) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: AgreementData }>("/ai/generate-agreement", {
        method: "POST",
        requiresAuth: true,
        body: { household_id: household.id },
      });

      if (res.data?.data) {
        setAgreement(res.data.data);
      } else {
        setError(res.error || "Failed to generate agreement.");
      }
    } catch (err: any) {
      setError(err?.message || "Generation error.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (clause: AgreementClause) => {
    setEditingClause(clause);
    setEditedContent(clause.content);
  };

  // Save Clause update
  const handleSaveClause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household || !agreement || !editingClause) return;

    setIsSavingClause(true);
    try {
      const updatedClauses = agreement.clauses.map((c) =>
        c.id === editingClause.id ? { ...c, content: editedContent } : c
      );

      const res = await apiRequest(`/ai/agreement/${household.id}/clauses`, {
        method: "PUT",
        requiresAuth: true,
        body: { clauses: updatedClauses },
      });

      if (res.data) {
        setAgreement({ ...agreement, clauses: updatedClauses });
        setEditingClause(null);
      } else {
        alert("Failed to update clause: " + res.error);
      }
    } catch (err: any) {
      alert("Error saving clause: " + err?.message);
    } finally {
      setIsSavingClause(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Quiet Hours":
        return "🌙";
      case "Guests":
        return "👥";
      case "Cleanliness":
        return "🧹";
      case "Supplies":
        return "🛒";
      case "Notice":
        return "📋";
      default:
        return "📌";
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto font-bold">
            📄
          </div>
          <h2 className="text-xl font-bold text-slate-900">AI Living Agreement</h2>
          <p className="text-xs text-slate-500">
            Please log in to review or generate your shared flat agreement.
          </p>
          <Link
            href="/login"
            className="block py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500">Loading living agreement...</p>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-900">No Household Workspace Found</h2>
          <p className="text-xs text-slate-500">
            You must be a member of a household workspace to create or view a shared living agreement.
          </p>
          <Link
            href="/household"
            className="block py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Go to Household Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Link href="/household" className="hover:text-indigo-600 transition">
            ← Back to Household Workspace
          </Link>
        </div>

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold">
              <span>🤖 AI Mediated Co-Living Compact</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {household.name} Living Agreement
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm leading-relaxed">
              Custom rules synthesized from your roommates&apos; 8 lifestyle dimensions to prevent common frictions and set clear household expectations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGenerateAgreement}
              disabled={isGenerating}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{isGenerating ? "Synthesizing..." : agreement ? "🔄 Regenerate with AI" : "✨ Generate Agreement"}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">
            {error}
          </div>
        )}

        {/* AI Loading Skeleton during synthesis */}
        {isGenerating && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-200 rounded-full"></div>
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-slate-200 rounded w-full"></div>
              <div className="h-3 bg-slate-200 rounded w-5/6"></div>
              <div className="h-3 bg-slate-200 rounded w-4/6"></div>
            </div>
            <p className="text-xs text-indigo-600 font-semibold text-center pt-2">
              Synthesizing 8 lifestyle profiles into actionable household clauses...
            </p>
          </div>
        )}

        {/* Empty State before generation */}
        {!agreement && !isGenerating && (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-3xl mx-auto font-bold">
              📑
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Agreement Generated Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click &apos;Generate Agreement&apos; above. RoomiLink AI will analyze all {members.length} roommates&apos; sleep cycles, cleanliness levels, and guest boundaries to draft a tailored contract.
            </p>
            <button
              onClick={handleGenerateAgreement}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition"
            >
              Generate AI Agreement Now
            </button>
          </div>
        )}

        {/* Active Agreement View */}
        {agreement && !isGenerating && (
          <div className="space-y-6">
            {/* Agreement Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                  Active {agreement.version}
                </span>
                <span className="text-slate-500">
                  5 Core Clauses · {members.length} Roommates
                </span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                🖨️ Print Agreement
              </button>
            </div>

            {/* 5 Clause Cards */}
            <div className="space-y-4">
              {agreement.clauses.map((clause) => (
                <div
                  key={clause.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3 hover:border-indigo-200 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base font-bold shadow-xs">
                        {getCategoryIcon(clause.category)}
                      </span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          Clause {clause.id}: {clause.category}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{clause.title}</h4>
                      </div>
                    </div>
                    <button
                      onClick={() => openEditModal(clause)}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      ✏️ Edit
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                    {clause.content}
                  </p>

                  {clause.rationale && (
                    <p className="text-[11px] text-slate-400 italic">
                      💡 Rationale: {clause.rationale}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Roommate Sign-Off Checklist */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Roommate Sign-Off Status</h3>
                  <p className="text-xs text-slate-500">
                    Each member reviews and digitally signs the living agreement
                  </p>
                </div>
                <button
                  onClick={() => setIsSignedByMe(!isSignedByMe)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                    isSignedByMe
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {isSignedByMe ? "✓ You Have Signed" : "Sign This Agreement"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((m) => {
                  const isCurrent = m.user_id === user?.id;
                  const isSigned = isCurrent ? isSignedByMe : true; // Teammates marked as agreed for demo
                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                          {m.user_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{m.user_name}</p>
                          <p className="text-[10px] text-slate-400">{m.role}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSigned
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isSigned ? "Signed" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Clause */}
        {editingClause && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-base">
                  Customize Clause: {editingClause.title}
                </h3>
                <button
                  onClick={() => setEditingClause(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveClause} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    House Rule Text
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <p className="text-[11px] text-slate-400">
                  Tailor this clause to fit any specific agreements your household made verbally.
                </p>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingClause(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingClause}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                  >
                    {isSavingClause ? "Saving..." : "Save Clause"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgreementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <AgreementContent />
    </Suspense>
  );
}
