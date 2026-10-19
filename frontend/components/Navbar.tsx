"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;
  const isAdmin = user?.role === "admin";

  // Hide the public consumer navbar completely when inside the Admin Center
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
                R
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  RoomiLink<span className="text-teal-600"> AI</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-1">
                  Shared Living
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/rooms"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActive("/rooms")
                  ? "text-indigo-600 bg-indigo-50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {isAuthenticated ? (isAdmin ? "Browse Rooms" : "Find Rooms") : "Explore Rooms"}
            </Link>

            {/* Roommates & Household Hub: Only shown to logged-in seekers */}
            {isAuthenticated && !isAdmin && (
              <>
                <Link
                  href="/roommates"
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive("/roommates")
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Find Roommates
                </Link>
                <Link
                  href="/household"
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive("/household")
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Household Hub
                </Link>
                <Link
                  href="/dashboard?tab=inquiries"
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive("/dashboard")
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  Inquiries
                </Link>
              </>
            )}


            <Link
              href="/pricing"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActive("/pricing")
                  ? "text-indigo-600 bg-indigo-50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Pricing
            </Link>
          </nav>

          {/* Right Action / Auth State */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <Link
                  href={isAdmin ? "/admin" : "/dashboard"}
                  className="flex items-center space-x-2 py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs uppercase ${isAdmin ? "bg-purple-600" : "bg-indigo-600"}`}>
                    {user.profile?.full_name?.charAt(0) || user.email.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-slate-800">
                    {user.profile?.full_name || user.email.split("@")[0]}
                    {isAdmin && <span className="ml-1.5 text-[10px] font-bold text-purple-600 uppercase bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">Admin</span>}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-slate-600 hover:text-rose-600 py-1.5 px-3 rounded-lg transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-indigo-600 px-3 py-2 rounded-lg transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all shadow-indigo-200 hover:shadow-indigo-300 active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          <Link
            href="/rooms"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
          >
            {isAuthenticated ? (isAdmin ? "Browse Rooms" : "Find Rooms") : "Explore Rooms"}
          </Link>

          {/* Seeker-only tools: Only for logged-in seekers */}
          {isAuthenticated && !isAdmin && (
            <>
              <Link
                href="/roommates"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
              >
                Find Roommates
              </Link>
              <Link
                href="/household"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
              >
                Household Hub
              </Link>
              <Link
                href="/dashboard?tab=inquiries"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
              >
                Inquiries Inbox
              </Link>
            </>
          )}


          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
          >
            Pricing
          </Link>

          <div className="pt-2 border-t border-slate-100 flex flex-col space-y-2">
            {isAuthenticated && user ? (
              <>
                <Link
                  href={isAdmin ? "/admin" : "/dashboard"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-indigo-600 bg-indigo-50"
                >
                  {isAdmin ? "Admin Center" : "Dashboard"} ({user.profile?.full_name || user.email})
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-left w-full px-3 py-2 rounded-md text-base font-medium text-rose-600 hover:bg-rose-50"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center px-4 py-2 rounded-md text-base font-semibold text-white bg-indigo-600"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
