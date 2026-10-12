"use client";

import React from "react";

interface CompatibilityScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function CompatibilityScoreBadge({
  score,
  size = "md",
  showLabel = true,
}: CompatibilityScoreBadgeProps) {
  let colorBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let barColor = "bg-emerald-500";
  let label = "High Synergy";

  if (score < 60) {
    colorBg = "bg-amber-50 text-amber-700 border-amber-200";
    barColor = "bg-amber-500";
    label = "Moderate Match";
  } else if (score < 80) {
    colorBg = "bg-indigo-50 text-indigo-700 border-indigo-200";
    barColor = "bg-indigo-500";
    label = "Great Match";
  }

  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm font-semibold",
    lg: "px-4 py-2 text-base font-bold",
  };

  return (
    <div className="inline-flex items-center space-x-2">
      <div
        className={`inline-flex items-center space-x-1.5 rounded-full border shadow-xs ${colorBg} ${sizeClasses[size]}`}
      >
        <span className="font-extrabold tracking-tight">{score}%</span>
        {showLabel && (
          <span className="text-xs font-medium opacity-90">· {label}</span>
        )}
      </div>
    </div>
  );
}
