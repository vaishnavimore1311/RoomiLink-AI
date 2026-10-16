"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updatePreferences } = useAuth();

  const [step, setStep] = useState(1);
  const [sleepSchedule, setSleepSchedule] = useState("flexible");
  const [cleanlinessLevel, setCleanlinessLevel] = useState(3);
  const [smokingStatus, setSmokingStatus] = useState("non_smoker");
  const [guestFrequency, setGuestFrequency] = useState("weekends");
  const [noiseTolerance, setNoiseTolerance] = useState("moderate");
  const [dietaryPref, setDietaryPref] = useState("any");
  const [workRoutine, setWorkRoutine] = useState("hybrid");
  const [petTolerance, setPetTolerance] = useState("friendly");
  const [budgetMin, setBudgetMin] = useState(500);
  const [budgetMax, setBudgetMax] = useState(1200);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
    if (user?.preference) {
      setSleepSchedule(user.preference.sleep_schedule || "flexible");
      setCleanlinessLevel(user.preference.cleanliness_level || 3);
      setSmokingStatus(user.preference.smoking_status || "non_smoker");
      setGuestFrequency(user.preference.guest_frequency || "weekends");
      setNoiseTolerance(user.preference.noise_tolerance || "moderate");
      setDietaryPref(user.preference.dietary_pref || "any");
      setWorkRoutine(user.preference.work_routine || "hybrid");
      setPetTolerance(user.preference.pet_tolerance || "friendly");
      setBudgetMin(user.preference.budget_min || 6000);
      setBudgetMax(user.preference.budget_max || 15000);
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    const result = await updatePreferences({
      sleep_schedule: sleepSchedule,
      cleanliness_level: cleanlinessLevel,
      smoking_status: smokingStatus,
      guest_frequency: guestFrequency,
      noise_tolerance: noiseTolerance,
      dietary_pref: dietaryPref,
      work_routine: workRoutine,
      pet_tolerance: petTolerance,
      budget_min: Number(budgetMin),
      budget_max: Number(budgetMax),
    });

    setIsSaving(false);

    if (result.success) {
      router.push("/rooms");
    } else {
      setErrorMessage(result.error || "Failed to save lifestyle habits.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full">
        {/* Progress Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 mb-2">
            Step {step} of 2: Lifestyle Habits
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            How Do You Live Day to Day?
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            RoomiLink AI uses your authentic everyday habits to find truly compatible roommates and avoid domestic conflicts.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Sleep Routine */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  1. Sleep Routine
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "early_bird", label: "Early Bird", desc: "Sleep before 10:30 PM" },
                    { id: "flexible", label: "Flexible", desc: "Sleep 11 PM – 12:30 AM" },
                    { id: "night_owl", label: "Night Owl", desc: "Sleep after 1:00 AM" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSleepSchedule(item.id)}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        sleepSchedule === item.id
                          ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cleanliness Scale */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-slate-800">
                    2. Cleanliness & Tidiness Standard
                  </label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {cleanlinessLevel === 1 && "1/5 - Very Relaxed"}
                    {cleanlinessLevel === 2 && "2/5 - Casual"}
                    {cleanlinessLevel === 3 && "3/5 - Moderate / Standard"}
                    {cleanlinessLevel === 4 && "4/5 - Neat & Tidy"}
                    {cleanlinessLevel === 5 && "5/5 - Meticulous"}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={cleanlinessLevel}
                  onChange={(e) => setCleanlinessLevel(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Relaxed about dishes</span>
                  <span>Daily tidy up</span>
                  <span>Spotless deep clean</span>
                </div>
              </div>

              {/* Noise Tolerance */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  3. Noise Tolerance
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "quiet_strict", label: "Quiet Space", desc: "Need strict quiet hours" },
                    { id: "moderate", label: "Moderate", desc: "Normal TV/music is fine" },
                    { id: "lively", label: "Lively", desc: "Social household noise is okay" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNoiseTolerance(item.id)}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        noiseTolerance === item.id
                          ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Guests Policy */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  4. Guests & Visitors Frequency
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "rarely", label: "Rarely / Never", desc: "Prefer personal privacy" },
                    { id: "weekends", label: "Weekends Only", desc: "Social on Fri/Sat" },
                    { id: "frequent", label: "Frequent", desc: "Friends/partners welcome anytime" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGuestFrequency(item.id)}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        guestFrequency === item.id
                          ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
                >
                  Next: Habits & Budget &rarr;
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Work Routine */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  5. Work / Study Routine
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "on_site", label: "On-Site Daily", desc: "Out of apartment 9 to 5" },
                    { id: "hybrid", label: "Hybrid", desc: "Split between home & work" },
                    { id: "remote", label: "Full Remote (WFH)", desc: "Home most weekdays" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setWorkRoutine(item.id)}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        workRoutine === item.id
                          ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pet Tolerance */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  6. Pet Policy & Allergies
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "friendly", label: "Pet Friendly", desc: "Love cats / dogs" },
                    { id: "allergic", label: "Allergic / No Pets", desc: "Need a pet-free home" },
                    { id: "has_pet", label: "Have a Pet", desc: "Bringing a pet with me" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPetTolerance(item.id)}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        petTolerance === item.id
                          ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Budget Range */}
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  7. Monthly Rent Budget Range (₹ INR)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Minimum Rent</span>
                    <div className="relative mt-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold">₹</span>
                      <input
                        type="number"
                        min="2000"
                        max="60000"
                        step="500"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(Number(e.target.value))}
                        className="pl-8 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Maximum Rent</span>
                    <div className="relative mt-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold">₹</span>
                      <input
                        type="number"
                        min="2000"
                        max="60000"
                        step="500"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(Number(e.target.value))}
                        className="pl-8 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveAndContinue}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save & Go to Dashboard"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
