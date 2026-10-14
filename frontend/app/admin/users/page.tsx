"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { User } from "@/types/auth";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await apiRequest(`/admin/users/${userId}/role`, {
        method: "PATCH",
        requiresAuth: true,
        body: { role: newRole },
      });
      if (res.error) {
        setError(res.error);
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u))
        );
        setSuccessMsg(`User role updated to "${newRole}".`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update role.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Community &amp; User Governance
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review registered seekers, verified landlords, and assign platform staff roles.
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

      {/* Users Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-xs text-white uppercase tracking-wider">
            Registered Members ({users.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading user directory...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No registered users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/50">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Subscription</th>
                  <th className="py-3 px-4 text-right">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {users.map((u) => {
                  const hasSub = (u as any).subscription;
                  return (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                          {u.profile?.full_name?.[0] || u.email[0]}
                        </div>
                        {u.profile?.full_name || "Profile Incomplete"}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {u.email}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === "admin"
                              ? "bg-purple-950 text-purple-300 border border-purple-800"
                              : u.role === "lister"
                              ? "bg-teal-950 text-teal-300 border border-teal-800"
                              : "bg-indigo-950 text-indigo-300 border border-indigo-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {u.profile?.city || "Not Specified"}
                      </td>

                      <td className="py-3.5 px-4">
                        {hasSub ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            ⭐ {hasSub.plan?.name || "Active Sub"}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Free Tier</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
                        >
                          <option value="seeker">Seeker</option>
                          <option value="lister">Lister</option>
                          <option value="admin">Admin</option>
                        </select>
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
