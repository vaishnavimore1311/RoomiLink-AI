"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import {
  HouseholdInfo,
  HouseholdMemberInfo,
  LedgerData,
  ChoreItem,
  ExpenseItem,
  ActivityItem,
  ActivityParticipantInfo,
} from "@/types/household";

function HouseholdContent() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const isEligible = user?.role === "admin" || Boolean(user?.subscription?.is_active);

  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [members, setMembers] = useState<HouseholdMemberInfo[]>([]);
  const [myRole, setMyRole] = useState<string>("member");
  const [activeTab, setActiveTab] = useState<"expenses" | "activities" | "chores" | "members">("expenses");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Creation / Join form state
  const [createName, setCreateName] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Expenses & Ledger state
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Groceries");

  // Activities & Group Expenses state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actDate, setActDate] = useState(new Date().toISOString().split("T")[0]);
  const [actCategory, setActCategory] = useState("Party / Outing");
  const [actAmount, setActAmount] = useState("");
  const [actPayerId, setActPayerId] = useState<number | string>("");
  const [actParticipants, setActParticipants] = useState<number[]>([]);
  const [actSplitMethod, setActSplitMethod] = useState<"equal" | "custom">("equal");
  const [actCustomShares, setActCustomShares] = useState<Record<number, string>>({});
  const [actNotes, setActNotes] = useState("");
  const [actError, setActError] = useState<string | null>(null);
  const [actSubmitting, setActSubmitting] = useState(false);

  // Chores state
  const [chores, setChores] = useState<ChoreItem[]>([]);
  const [showAddChoreModal, setShowAddChoreModal] = useState(false);
  const [choreTitle, setChoreTitle] = useState("");
  const [choreFrequency, setChoreFrequency] = useState("weekly");
  const [choreDueDate, setChoreDueDate] = useState("Friday");
  const [choreAssignee, setChoreAssignee] = useState<string>("");

  // Departure & Member Removal state
  const [departureModalOpen, setDepartureModalOpen] = useState(false);
  const [departureType, setDepartureType] = useState<"leave" | "remove">("leave");
  const [departureTarget, setDepartureTarget] = useState<HouseholdMemberInfo | null>(null);
  const [departureLoading, setDepartureLoading] = useState(false);
  const [departureError, setDepartureError] = useState<string | null>(null);
  const [departureSuccess, setDepartureSuccess] = useState<string | null>(null);

  const fetchHouseholdData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{
        data: { household: HouseholdInfo; members: HouseholdMemberInfo[]; my_role: string } | null;
      }>("/household/current", { requiresAuth: true });

      if (res.data?.data) {
        setHousehold(res.data.data.household);
        setMembers(res.data.data.members);
        setMyRole(res.data.data.my_role);

        // Fetch ledger, chores, and activities in parallel
        const hhId = res.data.data.household.id;
        const [ledgerRes, choresRes, activitiesRes] = await Promise.all([
          apiRequest<{ data: LedgerData }>(`/household/${hhId}/expenses`, { requiresAuth: true }),
          apiRequest<{ data: ChoreItem[] }>(`/household/${hhId}/chores`, { requiresAuth: true }),
          apiRequest<{ data: ActivityItem[] }>(`/household/${hhId}/activities`, { requiresAuth: true }),
        ]);

        if (ledgerRes.data?.data) setLedger(ledgerRes.data.data);
        if (choresRes.data?.data) setChores(choresRes.data.data);
        if (activitiesRes.data?.data) setActivities(activitiesRes.data.data);
      } else {
        setHousehold(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load household.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHouseholdData();
  }, [fetchHouseholdData]);

  // Create Household handler
  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enforce subscription requirement: redirect unsubscribed users to /pricing
    if (!isEligible) {
      router.push("/pricing?reason=household_create");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: { household: HouseholdInfo }; code?: string; upgrade_url?: string }>("/household/create", {
        method: "POST",
        requiresAuth: true,
        body: { name: createName, address: createAddress },
      });

      // Intercept 403 SUBSCRIPTION_REQUIRED response from backend
      if (res.status === 403 && (res.data?.code === "SUBSCRIPTION_REQUIRED" || res.error?.toLowerCase().includes("subscription"))) {
        router.push(res.data?.upgrade_url || "/pricing?reason=household_create");
        return;
      }

      if (res.data?.data) {
        await fetchHouseholdData();
      } else {
        setError(res.error || "Failed to create household.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  // Join Household handler
  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enforce subscription requirement: redirect unsubscribed users to /pricing
    if (!isEligible) {
      router.push("/pricing?reason=household_join");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: { household: HouseholdInfo }; code?: string; upgrade_url?: string }>("/household/join", {
        method: "POST",
        requiresAuth: true,
        body: { invite_code: joinCode.trim().toUpperCase() },
      });

      // Intercept 403 SUBSCRIPTION_REQUIRED response from backend
      if (res.status === 403 && (res.data?.code === "SUBSCRIPTION_REQUIRED" || res.error?.toLowerCase().includes("subscription"))) {
        router.push(res.data?.upgrade_url || "/pricing?reason=household_join");
        return;
      }

      if (res.data?.data) {
        await fetchHouseholdData();
      } else {
        setError(res.error || "Failed to join household with this code.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  // Copy Invite Code
  const copyInviteCode = () => {
    if (!household?.invite_code) return;
    navigator.clipboard.writeText(household.invite_code);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Add Expense handler
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household) return;
    setActionLoading(true);
    try {
      const res = await apiRequest(`/household/${household.id}/expenses`, {
        method: "POST",
        requiresAuth: true,
        body: {
          title: expTitle,
          amount: parseFloat(expAmount),
          category: expCategory,
        },
      });
      if (res.data) {
        setExpTitle("");
        setExpAmount("");
        setShowAddExpenseModal(false);
        // Refresh ledger
        const ledgerRes = await apiRequest<{ data: LedgerData }>(
          `/household/${household.id}/expenses`,
          { requiresAuth: true }
        );
        if (ledgerRes.data?.data) setLedger(ledgerRes.data.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to record expense.");
    } finally {
      setActionLoading(false);
    }
  };

  // Settle Debt handler
  const handleSettleDebt = async (creditorId: number) => {
    if (!household) return;
    try {
      await apiRequest(`/household/${household.id}/settle`, {
        method: "POST",
        requiresAuth: true,
        body: { to_user_id: creditorId },
      });
      // Refresh ledger
      const ledgerRes = await apiRequest<{ data: LedgerData }>(
        `/household/${household.id}/expenses`,
        { requiresAuth: true }
      );
      if (ledgerRes.data?.data) setLedger(ledgerRes.data.data);
    } catch (err: any) {
      alert("Failed to settle debt: " + err?.message);
    }
  };

  // Departure handlers
  const handleOpenDepartureModal = (member: HouseholdMemberInfo, type: "leave" | "remove") => {
    setDepartureTarget(member);
    setDepartureType(type);
    setDepartureError(null);
    setDepartureSuccess(null);
    setDepartureModalOpen(true);
  };

  const handleConfirmDeparture = async () => {
    if (!household || !departureTarget) return;
    setDepartureLoading(true);
    setDepartureError(null);
    setDepartureSuccess(null);

    try {
      if (departureType === "leave") {
        const res = await apiRequest<{ message: string; data?: any }>(
          `/household/${household.id}/leave`,
          { method: "POST", requiresAuth: true }
        );
        if (res.error) {
          setDepartureError(res.error);
          setDepartureLoading(false);
          return;
        }
        setDepartureSuccess(res.data?.message || "Successfully left household.");
        setTimeout(() => {
          setDepartureModalOpen(false);
          setDepartureLoading(false);
          setHousehold(null);
          fetchHouseholdData();
        }, 1200);
      } else {
        const res = await apiRequest<{ message: string; data?: any }>(
          `/household/${household.id}/members/${departureTarget.user_id}`,
          { method: "DELETE", requiresAuth: true }
        );
        if (res.error) {
          setDepartureError(res.error);
          setDepartureLoading(false);
          return;
        }
        setDepartureSuccess(res.data?.message || "Member removed from household.");
        setTimeout(() => {
          setDepartureModalOpen(false);
          setDepartureLoading(false);
          fetchHouseholdData();
        }, 1200);
      }
    } catch (err: any) {
      setDepartureError(err?.message || "An unexpected error occurred during departure.");
      setDepartureLoading(false);
    }
  };

  // Open Add Activity Modal with defaults
  const openAddActivityModal = () => {
    setActTitle("");
    setActDesc("");
    setActDate(new Date().toISOString().split("T")[0]);
    setActCategory("Party / Outing");
    setActAmount("");
    setActPayerId(user?.id || (members.length > 0 ? members[0].user_id : ""));
    setActParticipants(members.map((m) => m.user_id));
    setActSplitMethod("equal");
    setActCustomShares({});
    setActNotes("");
    setActError(null);
    setShowAddActivityModal(true);
  };

  const handleToggleParticipant = (userId: number) => {
    setActParticipants((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAllParticipants = () => {
    setActParticipants(members.map((m) => m.user_id));
  };

  const handleDeselectAllParticipants = () => {
    setActParticipants([]);
  };

  const handleCustomShareChange = (userId: number, value: string) => {
    setActCustomShares((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  // Create Activity Expense handler
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household) return;

    setActError(null);

    // Validation
    if (!actTitle.trim()) {
      setActError("Activity name is required.");
      return;
    }

    const totalNum = parseFloat(actAmount);
    if (isNaN(totalNum) || totalNum <= 0) {
      setActError("Total amount must be greater than zero.");
      return;
    }

    if (actParticipants.length === 0) {
      setActError("Please select at least one participating roommate.");
      return;
    }

    const payer = actPayerId ? parseInt(String(actPayerId)) : user?.id;
    if (!payer) {
      setActError("Please select who paid for this activity.");
      return;
    }

    let customSharesPayload: Record<number, number> | undefined = undefined;
    if (actSplitMethod === "custom") {
      let sumCustomCents = 0;
      const targetCents = Math.round(totalNum * 100);
      customSharesPayload = {};

      for (const uid of actParticipants) {
        const valStr = actCustomShares[uid];
        const valNum = valStr !== undefined && valStr !== "" ? parseFloat(valStr) : 0;
        if (isNaN(valNum) || valNum < 0) {
          setActError("Custom share amounts must be valid non-negative numbers.");
          return;
        }
        const cents = Math.round(valNum * 100);
        sumCustomCents += cents;
        customSharesPayload[uid] = valNum;
      }

      if (sumCustomCents !== targetCents) {
        setActError(
          `Custom shares sum to ₹${(sumCustomCents / 100).toFixed(2)}, which does not match total ₹${totalNum.toFixed(2)}.`
        );
        return;
      }
    }

    setActSubmitting(true);
    try {
      const res = await apiRequest<{ data: ActivityItem }>(
        `/household/${household.id}/activities`,
        {
          method: "POST",
          requiresAuth: true,
          body: {
            title: actTitle.trim(),
            description: actDesc.trim() || undefined,
            category: actCategory,
            total_amount: totalNum,
            payer_id: payer,
            participant_ids: actParticipants,
            split_method: actSplitMethod,
            custom_shares: customSharesPayload,
            activity_date: actDate,
            notes: actNotes.trim() || undefined,
          },
        }
      );

      if (res.error) {
        setActError(res.error);
      } else {
        setShowAddActivityModal(false);
        // Refresh ledger and activities
        const [ledgerRes, actRes] = await Promise.all([
          apiRequest<{ data: LedgerData }>(`/household/${household.id}/expenses`, { requiresAuth: true }),
          apiRequest<{ data: ActivityItem[] }>(`/household/${household.id}/activities`, { requiresAuth: true }),
        ]);
        if (ledgerRes.data?.data) setLedger(ledgerRes.data.data);
        if (actRes.data?.data) setActivities(actRes.data.data);
      }
    } catch (err: any) {
      setActError(err?.message || "Failed to create activity expense.");
    } finally {
      setActSubmitting(false);
    }
  };

  // Add Chore handler
  const handleAddChore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!household) return;
    setActionLoading(true);
    try {
      const res = await apiRequest(`/household/${household.id}/chores`, {
        method: "POST",
        requiresAuth: true,
        body: {
          title: choreTitle,
          frequency: choreFrequency,
          due_date: choreDueDate,
          assigned_to_id: choreAssignee ? parseInt(choreAssignee) : null,
        },
      });
      if (res.data) {
        setChoreTitle("");
        setShowAddChoreModal(false);
        // Refresh chores
        const choresRes = await apiRequest<{ data: ChoreItem[] }>(
          `/household/${household.id}/chores`,
          { requiresAuth: true }
        );
        if (choresRes.data?.data) setChores(choresRes.data.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to add chore.");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Chore completion
  const handleToggleChore = async (choreId: number) => {
    if (!household) return;
    // Optimistic UI update
    setChores((prev) =>
      prev.map((c) => (c.id === choreId ? { ...c, is_completed: !c.is_completed } : c))
    );
    try {
      await apiRequest(`/household/${household.id}/chores/${choreId}/toggle`, {
        method: "PATCH",
        requiresAuth: true,
      });
    } catch (err: any) {
      // Revert if error
      const choresRes = await apiRequest<{ data: ChoreItem[] }>(
        `/household/${household.id}/chores`,
        { requiresAuth: true }
      );
      if (choresRes.data?.data) setChores(choresRes.data.data);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md text-center space-y-5">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto font-bold">
            🏠
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Household Workspace
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Manage shared expenses, debt ledgers, weekly chore rotations, and digital living agreements with your roommates.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/login"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              Log In to Workspace
            </Link>
            <Link
              href="/register"
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500">Loading household operations...</p>
        </div>
      </div>
    );
  }

  // User has no household yet -> Show onboarding creation / join view
  if (!household) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-extrabold text-slate-900">
              Welcome to Household Workspace
            </h1>
            <p className="text-sm text-slate-500 max-w-xl mx-auto">
              You are not currently part of a household workspace. Create a new one for your apartment or enter an invite code from your roommate.
            </p>
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl max-w-md mx-auto">
                {error}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create Household Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xl">
                  +
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Create a Household</h3>
                  <p className="text-xs text-slate-500">Start a shared space for your flat</p>
                </div>
              </div>

              {!isEligible && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-start space-x-2.5 text-indigo-950 text-xs">
                  <span className="text-base leading-none">⭐</span>
                  <div>
                    <p className="font-bold text-indigo-950">Subscription Required</p>
                    <p className="text-[11px] text-indigo-800 mt-0.5 leading-relaxed">
                      Creating a shared household workspace requires an active subscription.
                    </p>
                    <Link
                      href="/pricing?reason=household_create"
                      className="inline-flex items-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-1"
                    >
                      View Plans &amp; Pricing &rarr;
                    </Link>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateHousehold} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Apartment / Household Name
                  </label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Maple Street Commons"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Street Address & City
                  </label>
                  <input
                    type="text"
                    required
                    value={createAddress}
                    onChange={(e) => setCreateAddress(e.target.value)}
                    placeholder="e.g. Flat 402, Blue Ridge, Phase 1, Hinjewadi, Pune"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`w-full py-3 rounded-xl font-bold shadow-md transition cursor-pointer ${
                    !isEligible
                      ? "bg-indigo-700 hover:bg-indigo-800 text-white shadow-indigo-100"
                      : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-indigo-100"
                  }`}
                >
                  {actionLoading
                    ? "Creating Space..."
                    : !isEligible
                    ? "Subscribe to Create Workspace"
                    : "Create & Generate Invite Code"}
                </button>
              </form>
            </div>

            {/* Join Household Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-xl">
                  🔑
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Join via Invite Code</h3>
                  <p className="text-xs text-slate-500">Connect to your roommates&apos; active space</p>
                </div>
              </div>

              {!isEligible && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-950 text-xs">
                  <span className="text-base leading-none mt-0.5">⭐</span>
                  <div className="space-y-1">
                    <p className="font-bold text-amber-950">Subscription Required to Join</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Joining a household workspace via invite code requires an active subscription. Unsubscribed users will be redirected to choose a plan.
                    </p>
                    <Link
                      href="/pricing?reason=household_join"
                      className="inline-flex items-center text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline mt-0.5"
                    >
                      Explore Membership Plans &rarr;
                    </Link>
                  </div>
                </div>
              )}

              <form onSubmit={handleJoinHousehold} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    8-Character Invite Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A8F2C41D"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center tracking-widest text-sm uppercase text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Ask your roommate or lease admin for the 8-character invitation code displayed at the top of their dashboard.
                </p>

                <button
                  type="submit"
                  disabled={actionLoading || (isEligible && joinCode.length < 8)}
                  className={`w-full py-3 rounded-xl font-bold shadow-md transition cursor-pointer ${
                    !isEligible
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100"
                      : "bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white shadow-teal-100"
                  }`}
                >
                  {actionLoading
                    ? "Joining..."
                    : !isEligible
                    ? "Subscribe to Join Household"
                    : "Join Household"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Household Dashboard View
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Workspace Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {myRole === "admin" ? "Household Admin" : "Active Member"}
              </span>
              <span className="text-xs text-indigo-300">· {members.length} Roommates</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{household.name}</h1>
            <p className="text-xs text-slate-300">{household.address}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Invite Code Widget */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 flex items-center space-x-3">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                  Invite Code
                </p>
                <p className="font-mono font-bold text-sm tracking-wider text-teal-300">
                  {household.invite_code}
                </p>
              </div>
              <button
                onClick={copyInviteCode}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                {copySuccess ? "Copied!" : "Copy"}
              </button>
            </div>

            <Link
              href="/household/agreement"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md transition"
            >
              📄 AI Living Agreement
            </Link>
          </div>
        </div>

        {/* Departure Announcement Banner or Vacant Space Launcher */}
        {(() => {
          const departureNotice = activities.find(
            (a) =>
              a.category === "Notice" ||
              a.title?.toLowerCase().includes("moved out") ||
              a.title?.toLowerCase().includes("removed from the household")
          );

          if (departureNotice) {
            return (
              <div className="bg-gradient-to-r from-amber-900 via-orange-950 to-amber-900 rounded-2xl p-5 text-white shadow-md border border-amber-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30 flex items-center justify-center text-xl shrink-0">
                    🚪
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">
                        {departureNotice.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/30 text-amber-200 border border-amber-400/30 uppercase tracking-wider">
                        Vacant Bed Available
                      </span>
                    </div>
                    <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                      A roommate has recently departed from this household. Post a vacant bed listing to find a verified, AI-compatible flatmate replacement.
                    </p>
                  </div>
                </div>

                <Link
                  href={`/rooms/new?purpose=flatmate_share&source=household&household_id=${household.id}&address=${encodeURIComponent(
                    household.address || ""
                  )}&title=${encodeURIComponent(`Vacant Bed in ${household.name}`)}`}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-950/40 transition-all active:scale-95 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🛏️ Post Vacant Bed &rarr;</span>
                </Link>
              </div>
            );
          }

          return (
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-2xl p-5 text-white shadow-md border border-purple-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-400/30 flex items-center justify-center text-xl shrink-0">
                  🤝
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white">
                      Spare Bed or Empty Room in Your Flat?
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/30 text-purple-200 border border-purple-400/30 uppercase tracking-wider">
                      Flatmate Replacement
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/90 mt-0.5 leading-relaxed">
                    Post your vacant space to RoomiLink in 1-click. Split domestic rent &amp; bills with a verified, AI-compatible flatmate.
                  </p>
                </div>
              </div>

              <Link
                href={`/rooms/new?purpose=flatmate_share&source=household&household_id=${household.id}&address=${encodeURIComponent(
                  household.address || ""
                )}&title=${encodeURIComponent(`Shared Bed in ${household.name}`)}`}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-950/40 transition-all active:scale-95 shrink-0 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📢 Post Vacant Space &rarr;</span>
              </Link>
            </div>
          );
        })()}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
          {[
            { id: "expenses", label: "💰 Shared Expenses & Ledger" },
            { id: "activities", label: "🎉 Activities & Group Expenses" },
            { id: "chores", label: "🧹 Chore Rotations" },
            { id: "members", label: "👥 Roommate Roster" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3.5 transition cursor-pointer ${
                activeTab === tab.id
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: EXPENSES & DEBT LEDGER */}
        {activeTab === "expenses" && (
          <div className="space-y-8">
            {/* 3 Balance Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  You are Owed
                </span>
                <p className="text-3xl font-extrabold text-emerald-600">
                  +₹{(ledger?.total_owed_to_me || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-400">From roommates for shared bills</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  You Owe
                </span>
                <p className="text-3xl font-extrabold text-amber-600">
                  -₹{(ledger?.total_i_owe || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-400">Your share of expenses paid by others</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Net Balance
                </span>
                <p
                  className={`text-3xl font-extrabold ${
                    (ledger?.net_balance || 0) >= 0 ? "text-indigo-600" : "text-amber-600"
                  }`}
                >
                  {(ledger?.net_balance || 0) >= 0 ? "+" : "-"}₹
                  {Math.abs(ledger?.net_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-400">Overall household balance status</p>
              </div>
            </div>

            {/* Who Owes Whom Ledger */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Who Owes Whom (Simplified Debt Ledger)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculated automatically from shared purchases
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openAddActivityModal}
                    className="px-3.5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition flex items-center gap-1.5"
                  >
                    <span>🎉</span> Add Group Activity
                  </button>
                  <button
                    onClick={() => setShowAddExpenseModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition"
                  >
                    + Add Expense
                  </button>
                </div>
              </div>

              {!ledger?.debts?.length ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                  🎉 All squared away! No outstanding debts between household members.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ledger.debts.map((debt, idx) => {
                    const isMyDebt = debt.from_user_id === user?.id;
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                          isMyDebt
                            ? "bg-amber-50/50 border-amber-200"
                            : "bg-slate-50/70 border-slate-200"
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900">
                            {isMyDebt ? "You owe " : `${debt.from_user_name} owes `}
                            <span className="text-indigo-700">{debt.to_user_name}</span>
                          </p>
                          <p className="text-base font-extrabold text-slate-800">
                            ₹{debt.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        {isMyDebt && (
                          <button
                            onClick={() => handleSettleDebt(debt.to_user_id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                          >
                            Settle Debt
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Spending Breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Category Spending Breakdown</h3>
                <p className="text-xs text-slate-500">Aggregate household spending grouped by category</p>
              </div>

              {!ledger?.category_breakdown || Object.keys(ledger.category_breakdown).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                  No categorized expenses yet. Record expenses to see spending breakdown.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(ledger.category_breakdown).map(([category, total]) => (
                    <div
                      key={category}
                      className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1 text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                          {category === "Groceries"
                            ? "🛒"
                            : category === "Utilities"
                            ? "💡"
                            : category === "Rent"
                            ? "🏠"
                            : category === "Supplies"
                            ? "🧹"
                            : "📦"}
                        </span>
                        <span className="font-semibold text-slate-700 truncate">{category}</span>
                      </div>
                      <p className="text-base font-bold text-slate-900 pt-0.5">
                        ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expense Transaction History */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Recent Expense History</h3>
              {!ledger?.recent_expenses?.length ? (
                <p className="text-xs text-slate-500">No expenses recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {ledger.recent_expenses.map((exp) => (
                    <div key={exp.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {exp.category === "Groceries"
                            ? "🛒"
                            : exp.category === "Utilities"
                            ? "💡"
                            : exp.category.toLowerCase().includes("party") || exp.category.toLowerCase().includes("outing")
                            ? "🎉"
                            : exp.category.toLowerCase().includes("food") || exp.category.toLowerCase().includes("dining")
                            ? "🍕"
                            : exp.category.toLowerCase().includes("movie")
                            ? "🎬"
                            : exp.category.toLowerCase().includes("furniture")
                            ? "🛋️"
                            : "📦"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{exp.title}</p>
                            {exp.activity_id && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200">
                                🎉 Group Activity {exp.participant_count ? `(${exp.participant_count} roommates)` : ""}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Paid by {exp.payer_name} · {exp.category}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITIES & GROUP EXPENSES */}
        {activeTab === "activities" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <span>🎉</span> Activities & Group Expenses
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Organize outings, dinners, parties, or bulk purchases and split contributions strictly among participating roommates.
                </p>
              </div>
              <button
                onClick={openAddActivityModal}
                className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <span>+</span> Create Group Expense
              </button>
            </div>

            {!activities.length ? (
              <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-4">
                <div className="w-16 h-16 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                  🎉
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-base">No Group Activities Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Plan shared events without burdening non-participating roommates. Only selected participants will be allocated shares in the ledger.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2 text-left">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <span className="text-base">🎂</span>
                    <p className="font-bold text-slate-800">Birthday Parties</p>
                    <p className="text-[10px] text-slate-400">Share food & decor costs</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <span className="text-base">🍕</span>
                    <p className="font-bold text-slate-800">Food Delivery</p>
                    <p className="text-[10px] text-slate-400">Split dinner among eaters</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <span className="text-base">🎬</span>
                    <p className="font-bold text-slate-800">Movie Nights</p>
                    <p className="text-[10px] text-slate-400">Tickets & snacks outing</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <span className="text-base">🛋️</span>
                    <p className="font-bold text-slate-800">Shared Items</p>
                    <p className="text-[10px] text-slate-400">Furniture, appliances, trips</p>
                  </div>
                </div>
                <div className="pt-3">
                  <button
                    onClick={openAddActivityModal}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition"
                  >
                    Create Your First Activity
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activities.map((act) => {
                  const isPayer = act.payer_id === user?.id;
                  const myParticipant = act.participants.find((p) => p.user_id === user?.id);
                  const isParticipant = Boolean(myParticipant);

                  return (
                    <div
                      key={act.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Header badge & Category */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-slate-100 text-slate-700 flex items-center gap-1">
                            {act.category.toLowerCase().includes("party")
                              ? "🎂"
                              : act.category.toLowerCase().includes("food") || act.category.toLowerCase().includes("dining")
                              ? "🍕"
                              : act.category.toLowerCase().includes("movie")
                              ? "🎬"
                              : act.category.toLowerCase().includes("grocer")
                              ? "🛒"
                              : act.category.toLowerCase().includes("furniture")
                              ? "🛋️"
                              : "🎉"}{" "}
                            {act.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            {act.split_method === "equal" ? "Equal Split" : "Custom Split"}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{act.title}</h4>
                          {act.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {act.description}
                            </p>
                          )}
                          {act.activity_date && (
                            <p className="text-[11px] text-slate-400 mt-1">
                              📅 {new Date(act.activity_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </p>
                          )}
                        </div>

                        {/* Total Amount & Payer */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[11px] text-slate-500">Total Expense</span>
                            <span className="text-lg font-black text-slate-900">
                              ₹{act.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-slate-200/60">
                            <span className="text-slate-500">Paid by</span>
                            <span className="font-semibold text-indigo-700">
                              {act.payer_name} {isPayer ? "(You)" : ""}
                            </span>
                          </div>
                        </div>

                        {/* Participating Roommates */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-600">
                              Participants ({act.participants.length})
                            </span>
                            {isParticipant ? (
                              <span className="font-bold text-emerald-600 text-[10px]">
                                Your Share: ₹{myParticipant?.share_amount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">
                                You are not participating (₹0)
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {act.participants.map((p) => (
                              <span
                                key={p.id}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${
                                  p.user_id === user?.id
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold"
                                    : "bg-slate-50 text-slate-700 border-slate-200"
                                }`}
                              >
                                {p.user_name}: ₹{p.share_amount.toFixed(2)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <button
                        onClick={() => setSelectedActivity(act)}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        View Full Breakdown &rarr;
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHORE CHECKLIST */}
        {activeTab === "chores" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Weekly Chore Rotations</h3>
                <p className="text-xs text-slate-500">
                  Track recurring household tasks with single-click completion check-offs
                </p>
              </div>
              <button
                onClick={() => setShowAddChoreModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition"
              >
                + Add Chore
              </button>
            </div>

            {!chores.length ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl text-xs text-slate-500">
                No chores set up yet. Click &apos;+ Add Chore&apos; to schedule dishwashing, trash duty, or vacuuming!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {chores.map((chore) => (
                  <div
                    key={chore.id}
                    className={`p-4 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                      chore.is_completed
                        ? "bg-slate-50 border-slate-200 opacity-60"
                        : "bg-white border-slate-200 hover:border-indigo-300 shadow-xs"
                    }`}
                    onClick={() => handleToggleChore(chore.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={chore.is_completed}
                        onChange={() => {}} // Handled by div click
                        className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 pointer-events-none"
                      />
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            chore.is_completed
                              ? "line-through text-slate-400"
                              : "text-slate-900"
                          }`}
                        >
                          {chore.title}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Due: {chore.due_date || "Weekly"} · Assigned:{" "}
                          {chore.assigned_to_name || "Anyone"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        chore.is_completed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {chore.is_completed ? "Done" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ROOMMATE ROSTER */}
        {activeTab === "members" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Active Roommate Roster</h3>
              <p className="text-xs text-slate-500">
                Members with access to this household workspace
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((m) => {
                const isCurrentUser = m.user_id === user?.id;
                const canRemove = myRole === "admin" && !isCurrentUser;

                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                        {m.user_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-xs text-slate-900 truncate">
                            {m.user_name}
                          </p>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              m.role === "admin"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {m.role}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{m.user_email}</p>
                      </div>
                    </div>

                    {/* Departure & Removal Actions */}
                    {(isCurrentUser || canRemove) && (
                      <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                        {isCurrentUser ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDepartureModal(m, "leave")}
                            className="px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                          >
                            <span>🚪</span>
                            <span>Move Out / Leave Household</span>
                          </button>
                        ) : canRemove ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDepartureModal(m, "remove")}
                            className="px-3 py-1 text-[11px] font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1"
                          >
                            <span>✕</span>
                            <span>Remove</span>
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal: Add Expense */}
        {showAddExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-base">Record New Expense</h3>
                <button
                  onClick={() => setShowAddExpenseModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expense Title
                  </label>
                  <input
                    type="text"
                    required
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="e.g. WiFi Bill, Cook / Maid Salary, Groceries"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Groceries">Groceries</option>
                    <option value="Utilities">Utilities & WiFi</option>
                    <option value="Supplies">Household Supplies</option>
                    <option value="Rent">Rent & Maintenance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-400">
                  This expense will be split equally among all {members.length} members.
                </p>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddExpenseModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                  >
                    Record & Split
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Chore */}
        {showAddChoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-base">Schedule New Chore</h3>
                <button
                  onClick={() => setShowAddChoreModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddChore} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chore Description
                  </label>
                  <input
                    type="text"
                    required
                    value={choreTitle}
                    onChange={(e) => setChoreTitle(e.target.value)}
                    placeholder="e.g. Empty dishwasher, Take out recycling"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Frequency</label>
                    <select
                      value={choreFrequency}
                      onChange={(e) => setChoreFrequency(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi_weekly">Bi-Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Due Day</label>
                    <input
                      type="text"
                      value={choreDueDate}
                      onChange={(e) => setChoreDueDate(e.target.value)}
                      placeholder="e.g. Sunday"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign To Roommate
                  </label>
                  <select
                    value={choreAssignee}
                    onChange={(e) => setChoreAssignee(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">Rotating / Anyone</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddChoreModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                  >
                    Schedule Chore
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Activity / Create Group Expense */}
        {showAddActivityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl my-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Create Group Activity Expense</h3>
                    <p className="text-[11px] text-slate-500">Collect contributions strictly from participating roommates</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddActivityModal(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {actError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  ⚠️ {actError}
                </div>
              )}

              <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
                {/* Activity Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Activity Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    placeholder="e.g. Birthday Party, Movie Outing, Shared Furniture"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Category & Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={actCategory}
                      onChange={(e) => setActCategory(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="Party / Outing">🎉 Party / Outing</option>
                      <option value="Food & Dining">🍕 Food & Dining</option>
                      <option value="Groceries">🛒 Groceries</option>
                      <option value="Movie Outing">🎬 Movie Outing</option>
                      <option value="Trip / Travel">✈️ Trip / Travel</option>
                      <option value="Shared Furniture">🛋️ Shared Furniture</option>
                      <option value="Other">📦 Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Activity Date</label>
                    <input
                      type="date"
                      value={actDate}
                      onChange={(e) => setActDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Amount & Who Paid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Total Amount (₹ INR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={actAmount}
                      onChange={(e) => setActAmount(e.target.value)}
                      placeholder="e.g. 3000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Person Who Paid <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={actPayerId}
                      onChange={(e) => setActPayerId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.user_name} {m.user_id === user?.id ? "(You)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Participant Selection */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">
                      Select Participating Roommates <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllParticipants}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={handleDeselectAllParticipants}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Only checked roommates will contribute. Unchecked roommates are excluded and will owe ₹0.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {members.map((m) => {
                      const isChecked = actParticipants.includes(m.user_id);
                      return (
                        <label
                          key={m.user_id}
                          className={`p-2.5 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition ${
                            isChecked
                              ? "bg-indigo-50/60 border-indigo-200 text-indigo-950"
                              : "bg-slate-50 border-slate-200 text-slate-500 opacity-60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleParticipant(m.user_id)}
                            className="w-4 h-4 text-indigo-600 rounded-md border-slate-300"
                          />
                          <span className="font-semibold text-xs truncate">
                            {m.user_name} {m.user_id === user?.id ? "(You)" : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Split Method Toggle */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <label className="block font-semibold text-slate-700">Split Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActSplitMethod("equal")}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        actSplitMethod === "equal"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Equal Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setActSplitMethod("custom")}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        actSplitMethod === "custom"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Custom Split
                    </button>
                  </div>
                </div>

                {/* Live Split Preview / Custom Inputs */}
                {actSplitMethod === "equal" ? (
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5 text-xs text-indigo-950">
                    <p className="font-bold flex items-center justify-between">
                      <span>Equal Split Breakdown</span>
                      <span className="text-[11px] font-normal text-indigo-700">
                        {actParticipants.length} participant{actParticipants.length === 1 ? "" : "s"}
                      </span>
                    </p>
                    {actParticipants.length > 0 && parseFloat(actAmount) > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-indigo-900 font-medium">
                          Total ₹{parseFloat(actAmount).toFixed(2)} divided among {actParticipants.length} selected roommate{actParticipants.length === 1 ? "" : "s"}:
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {actParticipants.map((uid, idx) => {
                            const member = members.find((m) => m.user_id === uid);
                            const totalCents = Math.round(parseFloat(actAmount) * 100);
                            const baseCents = Math.floor(totalCents / actParticipants.length);
                            const rem = totalCents % actParticipants.length;
                            const share = (baseCents + (idx < rem ? 1 : 0)) / 100;
                            return (
                              <span key={uid} className="px-2.5 py-1 bg-white rounded-lg border border-indigo-200 font-bold text-xs text-slate-900 shadow-2xs">
                                {member?.user_name || `User ${uid}`}: ₹{share.toFixed(2)}
                              </span>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-emerald-700 font-semibold pt-0.5 flex items-center gap-1">
                          <span>✓</span>
                          <span>Sum equals ₹{parseFloat(actAmount).toFixed(2)} exactly{Math.round(parseFloat(actAmount) * 100) % actParticipants.length > 0 ? " (includes 1-paise rounding balance)" : ""}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-indigo-600">
                        Enter a total amount and select at least one roommate to preview shares.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800">Custom Participant Contributions</p>
                      {parseFloat(actAmount) > 0 && (
                        (() => {
                          const totalTargetCents = Math.round(parseFloat(actAmount) * 100);
                          const sumCents = actParticipants.reduce((sum, uid) => {
                            const val = parseFloat(actCustomShares[uid] || "0");
                            return sum + (isNaN(val) ? 0 : Math.round(val * 100));
                          }, 0);
                          const diff = (totalTargetCents - sumCents) / 100;
                          return diff === 0 ? (
                            <span className="text-emerald-600 font-bold text-[11px]">
                              ✓ Sum matches ₹{parseFloat(actAmount).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold text-[11px]">
                              {diff > 0 ? `Remaining: ₹${diff.toFixed(2)}` : `Over by: ₹${Math.abs(diff).toFixed(2)}`}
                            </span>
                          );
                        })()
                      )}
                    </div>

                    <div className="space-y-2">
                      {actParticipants.map((uid) => {
                        const member = members.find((m) => m.user_id === uid);
                        return (
                          <div key={uid} className="flex items-center justify-between gap-3">
                            <span className="font-medium text-slate-700 truncate w-1/2">
                              {member?.user_name || `User ${uid}`}
                            </span>
                            <div className="flex items-center gap-1 w-1/2">
                              <span className="text-slate-400">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={actCustomShares[uid] || ""}
                                onChange={(e) => handleCustomShareChange(uid, e.target.value)}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-right font-bold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Description & Notes */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={actNotes}
                    onChange={(e) => setActNotes(e.target.value)}
                    placeholder="Add details, receipt reference, or outing highlights..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddActivityModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actSubmitting}
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {actSubmitting ? "Saving Activity..." : "Save & Record Split"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Activity Full Details */}
        {selectedActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{selectedActivity.title}</h3>
                    <p className="text-[11px] text-slate-400">
                      {selectedActivity.category} · {selectedActivity.split_method === "equal" ? "Equal Split" : "Custom Split"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Total & Payer Banner */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <p className="text-slate-500">Total Expense</p>
                  <p className="text-xl font-black text-slate-900">
                    ₹{selectedActivity.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Paid in full by</p>
                  <p className="font-bold text-indigo-700 text-sm">{selectedActivity.payer_name}</p>
                </div>
              </div>

              {/* Member Contribution Breakdown */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-800">Roommate Share Breakdown</h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {members.map((m) => {
                    const participant = selectedActivity.participants.find((p) => p.user_id === m.user_id);
                    const isPayer = m.user_id === selectedActivity.payer_id;

                    return (
                      <div key={m.user_id} className="p-3 flex items-center justify-between bg-white">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900">
                            {m.user_name} {isPayer ? <span className="text-[10px] text-indigo-600 font-bold">(Payer)</span> : ""}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {participant
                              ? isPayer
                                ? "Paid total bill · covers own share"
                                : "Participating · owes share to payer"
                              : "Did not participate (₹0 debt)"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold text-xs ${
                              participant ? "text-slate-900" : "text-slate-300"
                            }`}
                          >
                            ₹{(participant ? participant.share_amount : 0).toFixed(2)}
                          </p>
                          <span
                            className={`text-[10px] font-medium ${
                              participant
                                ? isPayer
                                ? "text-emerald-600 font-bold"
                                : "text-amber-600"
                                : "text-slate-400"
                            }`}
                          >
                            {participant ? (isPayer ? "Self-funded" : "Unsettled") : "Excluded"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes if any */}
              {selectedActivity.notes && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-slate-700">Notes</p>
                  <p className="text-slate-600 text-[11px]">{selectedActivity.notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedActivity(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Household Departure Confirmation */}
        {departureModalOpen && departureTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{departureType === "leave" ? "🚪" : "⚠️"}</span>
                  <h3 className="font-bold text-slate-900 text-base">
                    {departureType === "leave" ? "Confirm Household Departure" : `Remove ${departureTarget.user_name}`}
                  </h3>
                </div>
                <button
                  onClick={() => !departureLoading && setDepartureModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                  disabled={departureLoading}
                >
                  ✕
                </button>
              </div>

              {departureError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  ⚠️ {departureError}
                </div>
              )}

              {departureSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <span>✓</span>
                  <span>{departureSuccess}</span>
                </div>
              )}

              {(() => {
                const isSelf = departureType === "leave";
                const unpaidDebt = isSelf
                  ? (ledger?.total_i_owe || 0)
                  : (ledger?.debts?.filter(d => d.from_user_id === departureTarget.user_id).reduce((sum, d) => sum + d.amount, 0) || 0);

                const isSoleAdmin = isSelf && myRole === "admin" && members.filter(m => m.role === "admin").length === 1;
                const otherMembersCount = members.filter(m => m.user_id !== departureTarget.user_id).length;

                return (
                  <div className="space-y-3 text-xs text-slate-700">
                    {/* Unsettled Debt Warning */}
                    {unpaidDebt > 0 ? (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-950">
                        <p className="font-bold text-amber-900 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>
                            {isSelf
                              ? `You have INR ${unpaidDebt.toFixed(2)} in unpaid shared expenses. Confirm departure?`
                              : `${departureTarget.user_name} has INR ${unpaidDebt.toFixed(2)} in unpaid shared expenses. Confirm removal?`}
                          </span>
                        </p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Existing financial obligations will remain preserved in the household debt ledger until formally settled with roommates.
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-600 leading-relaxed">
                        {isSelf
                          ? `Are you sure you want to move out of ${household?.name}? You will lose access to this shared household workspace.`
                          : `Are you sure you want to remove ${departureTarget.user_name} from the active household roster?`}
                      </p>
                    )}

                    {/* Sole admin reassignment notice */}
                    {isSoleAdmin && otherMembersCount > 0 && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 text-[11px] leading-relaxed">
                        👑 <strong>Admin Transfer:</strong> Because you are the sole household admin, admin privileges will automatically transfer to the next oldest roommate upon your departure.
                      </div>
                    )}

                    {/* Sole member dissolution notice */}
                    {isSelf && otherMembersCount === 0 && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-[11px] leading-relaxed">
                        🏠 <strong>Workspace Dissolution:</strong> You are the last remaining member. Confirming departure will dissolve and clean up this household workspace.
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setDepartureModalOpen(false)}
                        disabled={departureLoading}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeparture}
                        disabled={departureLoading}
                        className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50 ${
                          unpaidDebt > 0
                            ? "bg-amber-600 hover:bg-amber-700"
                            : "bg-rose-600 hover:bg-rose-700"
                        }`}
                      >
                        {departureLoading
                          ? "Processing..."
                          : isSelf
                          ? "Confirm Move Out & Leave"
                          : `Remove ${departureTarget.user_name}`}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HouseholdPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <HouseholdContent />
    </Suspense>
  );
}
