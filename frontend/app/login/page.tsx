"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to appropriate portal
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push("/rooms");
    }
  }, [isAuthenticated, user, router]);

  const validateForm = () => {
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      return false;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    const result = await login(email.trim().toLowerCase(), password);
    setIsSubmitting(false);

    if (result.success) {
      if (result.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } else {
      setErrorMessage(result.error || "Invalid email or password.");
    }
  };

  const handleDemoFill = () => {
    setEmail("sarah@example.com");
    setPassword("Password123!");
    setErrorMessage(null);
  };

  const handleAdminDemoFill = () => {
    setEmail("admin@roomilink.ai");
    setPassword("AdminPassword123!");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon */}
        <div className="flex justify-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-100">
              R
            </div>
          </Link>
        </div>

        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-slate-900">
          Welcome Back to RoomiLink AI
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Log in to manage your roommate matches, shared expenses, and household harmony.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 animate-fadeIn">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 text-sm font-medium">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-600 text-sm font-bold"
              >
                &times;
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all placeholder:text-slate-400 text-slate-900"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-xs text-indigo-600 hover:text-indigo-500 cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all placeholder:text-slate-400 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                  Remember this device
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-100 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Logging in...</span>
                  </span>
                ) : (
                  "Log in to RoomiLink AI"
                )}
              </button>
            </div>
          </form>

          {/* Demo Helper Box */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">Seeker Demo Account</p>
                <p className="text-[11px] text-slate-500">sarah@example.com / Password123!</p>
              </div>
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm transition-colors"
              >
                Auto-fill
              </button>
            </div>

            <div className="rounded-xl bg-purple-50/60 p-3 border border-purple-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <span>🛡️</span> Administrator Account
                </p>
                <p className="text-[11px] text-purple-700">admin@roomilink.ai / AdminPassword123!</p>
              </div>
              <button
                type="button"
                onClick={handleAdminDemoFill}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-white px-2.5 py-1 rounded-md border border-purple-200 shadow-sm transition-colors"
              >
                Auto-fill
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          <Link href="/" className="hover:underline">
            &larr; Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
