"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { User, VerificationDocument } from "@/types/auth";

// â”€â”€â”€ ID Verification Modal (Issue #95) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface VerificationModalProps {
  targetUser: User;
  onClose: () => void;
  onApproved: (updatedUser: User) => void;
  onRejected: (updatedUser: User) => void;
}

function VerificationModal({
  targetUser,
  onClose,
  onApproved,
  onRejected,
}: VerificationModalProps) {
  const doc: VerificationDocument | null | undefined =
    targetUser.verification_document;
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);

  const handleApprove = async () => {
    if (isApproving || isRejecting) return;
    setIsApproving(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: User }>(
        `/admin/users/${targetUser.id}/verify`,
        { method: "POST", requiresAuth: true }
      );
      if (res.error) {
        setError(res.error);
      } else if (res.data?.data) {
        onApproved(res.data.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to approve verification.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!confirmReject) {
      setConfirmReject(true);
      return;
    }
    if (isApproving || isRejecting) return;
    setIsRejecting(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: User }>(
        `/admin/users/${targetUser.id}/reject-verification`,
        { method: "POST", requiresAuth: true }
      );
      if (res.error) {
        setError(res.error);
      } else if (res.data?.data) {
        onRejected(res.data.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to reject verification.");
    } finally {
      setIsRejecting(false);
      setConfirmReject(false);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 bg-amber-50 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm">
              ðŸªª Photo ID Verification Review
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {targetUser.profile?.full_name || targetUser.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none font-bold flex-shrink-0"
            aria-label="Close"
          >
            Ã—
          </button>
        </div>

        {/* Document Metadata */}
        <div className="p-5 space-y-3">
          {!doc ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-center">
              No verification document found for this user.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Document Type
                  </span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {doc.document_type?.replace(/_/g, " ") || "â€”"}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Status
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      doc.status === "submitted"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : doc.status === "verified"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    File Name
                  </span>
                  <span className="font-mono text-slate-700 truncate block text-[11px]">
                    {doc.original_filename || "â€”"}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    File Size
                  </span>
                  <span className="font-semibold text-slate-700">
                    {formatFileSize(doc.file_size)}
                  </span>
                </div>
              </div>
              {doc.uploaded_at && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Submitted On
                  </span>
                  <span className="text-slate-700">
                    {new Date(doc.uploaded_at).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                ðŸ”’ File content is stored securely. Only metadata is displayed
                here.
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          {confirmReject && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
              âš ï¸ Click "Reject" again to confirm. This will mark the document as
              rejected.
            </div>
          )}
        </div>

        {/* Actions */}
        {doc && (
          <div className="p-5 pt-0 flex gap-3">
            <button
              onClick={handleReject}
              disabled={isApproving || isRejecting || !doc}
              className="flex-1 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all active:scale-95"
            >
              {isRejecting
                ? "Rejecting..."
                : confirmReject
                ? "âš ï¸ Confirm Reject"
                : "âœ— Reject"}
            </button>
            <button
              onClick={handleApprove}
              disabled={isApproving || isRejecting || !doc}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-100 transition-all active:scale-95"
            >
              {isApproving ? "Approving..." : "âœ“ Approve & Verify"}
            </button>
          </div>
        )}
        {!doc && (
          <div className="p-5 pt-0">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€ Grant Subscription Modal (Issue #95) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GrantPlanModalProps {
  prefillEmail: string;
  onClose: () => void;
  onSuccess: (updatedEmail: string) => void;
}

function GrantPlanModal({
  prefillEmail,
  onClose,
  onSuccess,
}: GrantPlanModalProps) {
  const [grantEmail, setGrantEmail] = useState(prefillEmail);
  const [grantPlan, setGrantPlan] = useState("pro_seeker");
  const [grantDays, setGrantDays] = useState(30);
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim() || isGranting) return;
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
        onSuccess(grantEmail.trim());
      }
    } catch (err: any) {
      setError(err?.message || "Failed to grant subscription.");
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200/80 overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 bg-indigo-50 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm">
              ðŸŽ Grant Subscription Plan
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Manually grant a VIP plan to this user
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none font-bold flex-shrink-0"
            aria-label="Close"
          >
            Ã—
          </button>
        </div>

        <form onSubmit={handleGrant} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              User Email Address
            </label>
            <input
              type="email"
              required
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g. priya@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Plan
              </label>
              <select
                value={grantPlan}
                onChange={(e) => setGrantPlan(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="pro_seeker">Pro Seeker (â‚¹499)</option>
                <option value="featured_host">Featured Host (â‚¹999)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Duration
              </label>
              <select
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
                <option value={365}>1 Year</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGranting}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-100 transition-all active:scale-95"
            >
              {isGranting ? "Granting..." : "ðŸŽ Grant Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€â”€ Role Change Confirmation Dialog (Issue #94) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface RoleConfirmModalProps {
  targetUser: User;
  newRole: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function RoleConfirmModal({
  targetUser,
  newRole,
  onConfirm,
  onCancel,
}: RoleConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200/80 overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 bg-purple-50">
          <h2 className="font-extrabold text-slate-900 text-sm">
            ðŸ‘‘ Promote to Admin?
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            This grants full platform administrator access.
          </p>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-700">
            You are about to promote{" "}
            <strong>
              {targetUser.profile?.full_name || targetUser.email}
            </strong>{" "}
            to the <strong>Admin</strong> role. Admins have full control over
            the platform.
          </p>
          <p className="text-xs text-slate-500">
            Are you sure you want to proceed?
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-purple-100 transition-all active:scale-95"
            >
              âœ“ Confirm Promotion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Admin Users Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Verification modal state (Issue #95)
  const [verifyTarget, setVerifyTarget] = useState<User | null>(null);

  // Grant Plan modal state (Issue #95)
  const [grantTarget, setGrantTarget] = useState<User | null>(null);

  // Role change pending confirmation (Issue #94)
  const [rolePending, setRolePending] = useState<{
    user: User;
    newRole: string;
  } | null>(null);

  // Per-row role updating state
  const [updatingRoles, setUpdatingRoles] = useState<Set<number>>(new Set());
  // Multi-criteria filter states (Issue #93)
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: User[] }>("/admin/users", {
        requiresAuth: true,
      });
      if (res.data?.data) {
        setUsers(res.data.data);
      } else {
        setError(res.error || "Failed to load users.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // â”€â”€ Role change handler (Issue #94) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleRoleChange = async (targetUser: User, newRole: string) => {
    // Issue #94: Prevent self-demotion in frontend
    if (
      currentAdmin &&
      targetUser.id === currentAdmin.id &&
      newRole !== "admin"
    ) {
      setError(
        "Self-demotion is not permitted. You cannot change your own admin role."
      );
      return;
    }

    // Issue #94: Confirm before promoting to admin
    if (newRole === "admin" && targetUser.role !== "admin") {
      setRolePending({ user: targetUser, newRole });
      return;
    }

    await executeRoleChange(targetUser.id, newRole);
  };

  const executeRoleChange = async (userId: number, newRole: string) => {
    setUpdatingRoles((prev) => new Set(prev).add(userId));
    setError(null);
    try {
      const res = await apiRequest<{ data: User }>(
        `/admin/users/${userId}/role`,
        {
          method: "PATCH",
          requiresAuth: true,
          body: { role: newRole },
        }
      );
      if (res.error) {
        setError(res.error);
      } else if (res.data?.data) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role: newRole as any } : u
          )
        );
        showSuccess(`Role updated to "${newRole}" successfully.`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update role.");
    } finally {
      setUpdatingRoles((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const confirmRoleChange = async () => {
    if (!rolePending) return;
    const { user: targetUser, newRole } = rolePending;
    setRolePending(null);
    await executeRoleChange(targetUser.id, newRole);
  };

  // â”€â”€ Verification handlers (Issue #95) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleVerificationApproved = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    setVerifyTarget(null);
    showSuccess(`${updatedUser.email} has been verified successfully.`);
  };

  const handleVerificationRejected = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    setVerifyTarget(null);
    showSuccess(`Verification document for ${updatedUser.email} was rejected.`);
  };

  const handleGrantSuccess = (email: string) => {
    setGrantTarget(null);
    showSuccess(`Subscription plan granted to ${email} successfully!`);
    fetchUsers(); // Refresh to show updated subscription
  };

  const isSelf = (u: User) =>
    currentAdmin !== null && u.id === currentAdmin?.id;

  // Filter users based on search, role, subscription tier, and ID verification status (Issue #93)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Live Search (Member Name, Email, City)
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const name = (u.profile?.full_name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const city = (u.profile?.city || "").toLowerCase();
        if (!name.includes(query) && !email.includes(query) && !city.includes(query)) {
          return false;
        }
      }

      // 2. Role Filter (All Roles, Seekers Only, Listers Only, Admins Only)
      if (roleFilter !== "all") {
        if (u.role !== roleFilter) {
          return false;
        }
      }

      // 3. Subscription Tier Filter (All Tiers, Active Paid Subscribers, Free Tier Members)
      if (subscriptionFilter !== "all") {
        const sub = (u as any).subscription;
        const isActiveSubscriber = Boolean(
          sub && (sub.is_active === true || sub.status === "active")
        );
        if (subscriptionFilter === "paid" && !isActiveSubscriber) {
          return false;
        }
        if (subscriptionFilter === "free" && isActiveSubscriber) {
          return false;
        }
      }

      // 4. ID Verification Filter (All Statuses, Verified, Pending Review, Unverified)
      if (verificationFilter !== "all") {
        const doc: VerificationDocument | null | undefined = u.verification_document;
        const isVerified = Boolean(u.is_verified || doc?.status === "verified");
        const isPending = !isVerified && Boolean(doc && doc.status === "submitted");
        const isUnverified = !isVerified && !isPending;

        if (verificationFilter === "verified" && !isVerified) {
          return false;
        }
        if (verificationFilter === "pending" && !isPending) {
          return false;
        }
        if (verificationFilter === "unverified" && !isUnverified) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchTerm, roleFilter, subscriptionFilter, verificationFilter]);

  const isFiltered =
    searchTerm.trim() !== "" ||
    roleFilter !== "all" ||
    subscriptionFilter !== "all" ||
    verificationFilter !== "all";

  const handleResetFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setSubscriptionFilter("all");
    setVerificationFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {verifyTarget && (
        <VerificationModal
          targetUser={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onApproved={handleVerificationApproved}
          onRejected={handleVerificationRejected}
        />
      )}

      {grantTarget && (
        <GrantPlanModal
          prefillEmail={grantTarget.email}
          onClose={() => setGrantTarget(null)}
          onSuccess={handleGrantSuccess}
        />
      )}

      {rolePending && (
        <RoleConfirmModal
          targetUser={rolePending.user}
          newRole={rolePending.newRole}
          onConfirm={confirmRoleChange}
          onCancel={() => setRolePending(null)}
        />
      )}

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Community &amp; User Governance
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review registered seekers, verified landlords, manage Photo ID
          verification, and assign platform staff roles.
        </p>
      </div>

      {/* â”€â”€ Toast Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold">
          âœ“ {successMsg}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-start justify-between gap-2">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold text-sm leading-none flex-shrink-0"
          >
            Ã—
          </button>
        </div>
      )}

      {/* â”€â”€ Filter & Search Toolbar (Issue #93) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Live Search */}
          <div>
            <label
              htmlFor="user-search-input"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1"
            >
              Search Members
            </label>
            <div className="relative">
              <input
                id="user-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email, or city..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs pointer-events-none">
                ðŸ”
              </span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  aria-label="Clear search"
                >
                  âœ•
                </button>
              )}
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label
              htmlFor="role-filter-select"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1"
            >
              Member Role
            </label>
            <select
              id="role-filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition font-medium text-slate-800"
            >
              <option value="all">All Roles</option>
              <option value="seeker">Seekers Only</option>
              <option value="lister">Listers Only</option>
              <option value="admin">Admins Only</option>
            </select>
          </div>

          {/* Subscription Tier Filter */}
          <div>
            <label
              htmlFor="subscription-filter-select"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1"
            >
              Subscription Tier
            </label>
            <select
              id="subscription-filter-select"
              value={subscriptionFilter}
              onChange={(e) => setSubscriptionFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition font-medium text-slate-800"
            >
              <option value="all">All Tiers</option>
              <option value="paid">Active Paid Subscribers</option>
              <option value="free">Free Tier Members</option>
            </select>
          </div>

          {/* ID Verification Filter */}
          <div>
            <label
              htmlFor="verification-filter-select"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1"
            >
              ID Verification
            </label>
            <select
              id="verification-filter-select"
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition font-medium text-slate-800"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified (âœ“)</option>
              <option value="pending">Pending Review (â³)</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>

        {/* Results Counter and Reset Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">
              Showing <span className="font-bold text-slate-900">{filteredUsers.length}</span> of{" "}
              <span className="font-bold text-slate-900">{users.length}</span> members
            </span>
            {isFiltered && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Filtered
              </span>
            )}
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              <span>â†º</span>
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* â”€â”€ Users Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
            Registered Members ({filteredUsers.length}{isFiltered ? ` of ${users.length}` : ""})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading user directory...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No registered users found.
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs space-y-3">
            <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-base mx-auto font-bold">
              ðŸ”
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">No members match your filters</p>
              <p className="text-slate-500 mt-1">
                Try adjusting your search keyword or relaxing selected filter criteria.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Subscription</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Grant Plan</th>
                  <th className="py-3 px-4 text-right">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const hasSub = (u as any).subscription;
                  const doc: VerificationDocument | null | undefined =
                    u.verification_document;
                  const self = isSelf(u);
                  const isUpdatingRole = updatingRoles.has(u.id);

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xs uppercase border border-indigo-200 flex-shrink-0">
                            {u.profile?.full_name?.[0] || u.email[0]}
                          </div>
                          <div>
                            <span className="block">
                              {u.profile?.full_name || "Profile Incomplete"}
                            </span>
                            {self && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 mt-0.5">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {u.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-800 border-purple-200"
                              : u.role === "lister"
                              ? "bg-teal-100 text-teal-800 border-teal-200"
                              : "bg-indigo-100 text-indigo-800 border-indigo-200"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* City */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {u.profile?.city || "Not Specified"}
                      </td>

                      {/* Subscription */}
                      <td className="py-3.5 px-4">
                        {hasSub ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            â­ {hasSub.plan?.name || "Active Sub"}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">
                            Free Tier
                          </span>
                        )}
                      </td>

                      {/* Verification badge (Issue #95) */}
                      <td className="py-3.5 px-4">
                        {u.is_verified ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            âœ“ Verified
                          </span>
                        ) : doc ? (
                          <button
                            onClick={() => setVerifyTarget(u)}
                            title="Click to review this user's submitted verification document"
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 transition-colors cursor-pointer"
                          >
                            â³ ID Submitted
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">
                            Not Submitted
                          </span>
                        )}
                      </td>

                      {/* Grant Plan button (Issue #95) */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setGrantTarget(u)}
                          title={`Grant a subscription plan to ${u.email}`}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap"
                        >
                          ðŸŽ Grant Plan
                        </button>
                      </td>

                      {/* Role dropdown (Issue #94) */}
                      <td className="py-3.5 px-4 text-right">
                        {self ? (
                          /* Issue #94: Disable role dropdown for current admin */
                          <div className="flex flex-col items-end gap-1">
                            <select
                              value={u.role}
                              disabled
                              className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 text-xs font-semibold cursor-not-allowed opacity-60"
                            >
                              <option value={u.role}>{u.role}</option>
                            </select>
                            <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                              Current User â€“ Protected
                            </span>
                          </div>
                        ) : isUpdatingRole ? (
                          <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-500">
                            <div className="w-3 h-3 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            Updating...
                          </div>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handleRoleChange(u, e.target.value)
                            }
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                          >
                            <option value="seeker">Seeker</option>
                            <option value="lister">Lister</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
