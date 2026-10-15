"use client";

import React, { useEffect, useState } from "react";
import { MatchBreakdownData } from "@/types/matching";
import { apiRequest } from "@/lib/api";
import CompatibilityScoreBadge from "./CompatibilityScoreBadge";

interface MatchExplanationModalProps {
  candidateId: number;
  candidateName: string;
  initialScore: number;
  onClose: () => void;
}

export default function MatchExplanationModal({
  candidateId,
  candidateName,
  initialScore,
  onClose,
}: MatchExplanationModalProps) {
  const [data, setData] = useState<MatchBreakdownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState(false);
  const [introMessage, setIntroMessage] = useState("");

  useEffect(() => {
    const fetchBreakdown = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ data: MatchBreakdownData }>(
          `/matching/${candidateId}/breakdown`,
          { requiresAuth: false }
        );
        if (res.data?.data) {
          setData(res.data.data);
        } else {
          setError(res.error || "Failed to load breakdown details.");
        }
      } catch (err: any) {
        setError(err?.message || "Network error loading breakdown.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreakdown();
  }, [candidateId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-bold text-slate-900">
                Match Breakdown with {candidateName}
              </h3>
              <CompatibilityScoreBadge score={data?.compatibility_score ?? initialScore} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-factor algorithmic lifestyle comparison
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500">Calculating dimension matrix...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Profile Overview */}
              <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                  {candidateName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{candidateName}</h4>
                  <p className="text-xs text-slate-500">
                    {data.candidate.occupation || "Professional"} · {data.candidate.city || "Pune, Maharashtra"}
                  </p>
                  {data.candidate.bio && (
                    <p className="text-xs text-slate-600 mt-1 italic">
                      &ldquo;{data.candidate.bio}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Strengths (+) Section */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2.5 flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </span>
                  <span>Compatibility Strengths</span>
                </h5>
                <div className="space-y-2">
                  {data.strengths.map((str, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-start space-x-2"
                    >
                      <span className="text-emerald-600 font-bold mt-0.5">•</span>
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Friction Points (!) Section */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2.5 flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    !
                  </span>
                  <span>Friction Points & Discussion Areas</span>
                </h5>
                <div className="space-y-2">
                  {data.frictions.map((fric, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-xs text-amber-900 flex items-start space-x-2"
                    >
                      <span className="text-amber-600 font-bold mt-0.5">•</span>
                      <span>{fric}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8-Factor Dimension Breakdown */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Dimension Alignment Index
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {Object.entries(data.breakdown).map(([key, val]) => (
                    <div key={key} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="flex justify-between font-medium text-slate-700 capitalize mb-1">
                        <span>{key}</span>
                        <span className="font-semibold text-slate-900">{val}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            val >= 80 ? "bg-emerald-500" : val >= 50 ? "bg-indigo-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Intro Message Section */}
              <div className="pt-2 border-t border-slate-100">
                {messageSent ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium text-center">
                    Intro message sent to {candidateName}! Check your chat inbox for replies.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Send Quick Introduction
                    </label>
                    <textarea
                      value={introMessage}
                      onChange={(e) => setIntroMessage(e.target.value)}
                      placeholder={`Hi ${candidateName}, I noticed we have a ${data.compatibility_score}% compatibility match on RoomiLink AI...`}
                      rows={2}
                      className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMessageSent(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition"
                      >
                        Send Introduction
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
