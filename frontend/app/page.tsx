import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 mb-6 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Beyond Finding a Room &bull; Building Compatible Shared Living
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Stop Guessing Roommates. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-teal-500 bg-clip-text text-transparent">
              Live in Real Harmony.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            RoomiLink AI matches you by lifestyle habits, sleep routines, and budgets, then continues to support your household with debt-free expense splitting and AI conflict prevention.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 text-sm"
            >
              Get Started Free &rarr;
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all text-sm"
            >
              Log In to Account
            </Link>
          </div>
        </div>
      </section>

      {/* 4 Pillars Section */}
      <section className="py-16 bg-white border-y border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              The Complete Shared Living Journey
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Unlike generic room portals, RoomiLink AI accompanies you from initial search all the way through peaceful daily co-living.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* 1. Find */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mb-4">
                  01
                </div>
                <h3 className="font-bold text-base text-slate-900">Find Rooms</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Search verified properties by budget, room type, and location with transparent landlord terms.
                </p>
              </div>
            </div>

            {/* 2. Connect */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm mb-4">
                  02
                </div>
                <h3 className="font-bold text-base text-slate-900">Match Roommates</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Compare sleep schedules, cleanliness habits, noise tolerance, and get explainable match scores.
                </p>
              </div>
            </div>

            {/* 3. Live Together */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm mb-4">
                  03
                </div>
                <h3 className="font-bold text-base text-slate-900">Live Together</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Join a shared household workspace with automated expense splitting, debt ledgers, and chore rotations.
                </p>
              </div>
            </div>

            {/* 4. AI Harmony */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm mb-4">
                  04
                </div>
                <h3 className="font-bold text-base text-slate-900">AI Intelligence</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Generate digital living agreements, detect unspoken domestic friction, and keep relationships healthy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
