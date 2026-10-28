"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: "📊" },
    { label: "Manage Rooms", href: "/admin/rooms", icon: "🏠" },
    { label: "Add Pune Room", href: "/admin/rooms/new", icon: "➕" },
    { label: "Subscriptions", href: "/admin/subscriptions", icon: "💳" },
    { label: "Users & Roles", href: "/admin/users", icon: "👥" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Verifying administrator authorization...</span>
        </div>
      </div>
    );
  }

  // Security Guard: restrict strictly to role="admin"
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-xl shadow-rose-100/50">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-rose-100">
            🔒
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Administrator Access Required</h2>
          <p className="text-sm text-slate-600 mt-2">
            You must be signed in with an authorized Administrator account to view and manage this portal.
          </p>

          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 text-left">
            <p className="font-bold text-slate-800 mb-1">Demo Admin Credentials:</p>
            <p>Email: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-indigo-700 font-mono">admin@roomilink.ai</code></p>
            <p className="mt-1">Password: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-indigo-700 font-mono">AdminPassword123!</code></p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/login?redirect=/admin"
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-100 transition-all active:scale-95"
            >
              Sign In as Admin
            </Link>
            <Link
              href="/"
              className="py-2.5 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 h-full overflow-y-auto">
        <div>
          {/* Admin Header */}
          <div className="p-6 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-100">
                🛡️
              </div>
              <div>
                <h1 className="font-extrabold text-base text-slate-900 tracking-tight leading-tight">Admin Center</h1>
                <p className="text-[11px] text-indigo-600 font-bold">Pune &amp; Subscriptions</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile and Exit Link */}
        <div className="p-4 border-t border-slate-200/80 space-y-3 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xs uppercase border border-indigo-200">
              {user.email[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">{user.profile?.full_name || "Administrator"}</p>
              <p className="text-[10px] text-indigo-600 font-semibold truncate">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
              title="Visit the public site while staying logged in as Admin"
            >
              <span>🌐</span> Public Site
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors"
              title="Log out and return to public website as guest"
            >
              <span>🚪</span> Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Canvas */}
      <main className="flex-1 h-full overflow-y-auto bg-slate-50 min-w-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
