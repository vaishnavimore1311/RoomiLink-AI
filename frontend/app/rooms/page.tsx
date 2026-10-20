"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RoomListing } from "@/types/room";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function RoomsPage() {
  const { user, isAuthenticated } = useAuth();
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [maxRent, setMaxRent] = useState<number>(35000);
  const [roomType, setRoomType] = useState<string>("all");
  const [selectedAmenity, setSelectedAmenity] = useState<string>("");

  // Determine if user is eligible to create listings
  const isEligibleToList =
    user?.role === "admin" ||
    (user?.subscription?.is_active === true);

  const handleListRoomClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      // Not logged in — let the link navigate to /rooms/new which will redirect to /login
      return;
    }
    if (!isEligibleToList) {
      e.preventDefault();
      setShowUpgradeModal(true);
    }
    // If eligible, let the link navigate normally
  };

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (city.trim()) params.append("city", city.trim());
      if (search.trim()) params.append("search", search.trim());
      if (roomType !== "all") params.append("room_type", roomType);
      if (maxRent) params.append("budget_max", maxRent.toString());

      const res = await apiRequest<{ data: RoomListing[] }>(`/rooms?${params.toString()}`, {
        requiresAuth: false,
      });

      if (res.data?.data) {
        setRooms(res.data.data);
      } else {
        setError(res.error || "Failed to load room listings.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading rooms.");
    } finally {
      setIsLoading(false);
    }
  }, [city, search, roomType, maxRent]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const filteredRooms = selectedAmenity
    ? rooms.filter((r) => r.amenities?.includes(selectedAmenity))
    : rooms;

  const resetFilters = () => {
    setSearch("");
    setCity("");
    setMaxRent(35000);
    setRoomType("all");
    setSelectedAmenity("");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Subscription Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full mx-4 space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Subscription Required</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Listing rooms and properties is available to subscribed users only.
                Subscribe to a plan to start connecting with verified tenants.
              </p>
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/pricing"
                  className="w-full inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95"
                >
                  View Plans &amp; Subscribe
                </Link>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header & CTA */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Find Verified Rooms & Apartments
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Browse student and professional accommodations with transparent terms and verified hosts.
            </p>
          </div>
          <Link
            href="/rooms/new"
            onClick={handleListRoomClick}
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm shadow-indigo-100 transition-all active:scale-95 whitespace-nowrap"
          >
            List a Spare Room
          </Link>
        </div>

        {/* Pune Hotspots Bar */}
        <div className="bg-gradient-to-r from-indigo-50 to-teal-50/50 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Pune City Hubs:</span>
              <span className="text-[11px] text-slate-500">Instant-filter verified rooms in Pune IT &amp; college localities</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "All Rooms", c: "", s: "" },
              { label: "All Pune", c: "Pune", s: "" },
              { label: "Hinjewadi", c: "Pune", s: "Hinjewadi" },
              { label: "Baner", c: "Pune", s: "Baner" },
              { label: "Wakad", c: "Pune", s: "Wakad" },
              { label: "Viman Nagar", c: "Pune", s: "Viman Nagar" },
              { label: "Kothrud", c: "Pune", s: "Kothrud" },
              { label: "Kharadi", c: "Pune", s: "Kharadi" }
            ].map((hotspot) => {
              const isActive = (hotspot.label === "All Rooms" && !city && !search) ||
                (hotspot.c === city && (hotspot.s === search || (!hotspot.s && !search)));
              return (
                <button
                  key={hotspot.label}
                  type="button"
                  onClick={() => {
                    setCity(hotspot.c);
                    setSearch(hotspot.s);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {hotspot.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Search Keywords</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g., Campus, Downtown, Quiet"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City / Pune Locality</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Hinjewadi, Baner, Pune"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            {/* Room Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Room Type</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
              >
                <option value="all">All Room Types</option>
                <option value="private">Private Room</option>
                <option value="shared">Shared Room</option>
                <option value="master">Master Bedroom (Ensuite)</option>
              </select>
            </div>

            {/* Max Budget Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700">Max Budget</label>
                <span className="text-xs font-bold text-indigo-600">₹{maxRent.toLocaleString("en-IN")} / mo</span>
              </div>
              <input
                type="range"
                min="3000"
                max="40000"
                step="500"
                value={maxRent}
                onChange={(e) => setMaxRent(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Amenities Quick Filters */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Filter Amenity:</span>
            {["High-Speed Wi-Fi", "Air Conditioner", "Power Backup", "Cook Available", "Washing Machine", "Gated Security"].map((amenity) => (
              <button
                key={amenity}
                type="button"
                onClick={() => setSelectedAmenity(selectedAmenity === amenity ? "" : amenity)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${selectedAmenity === amenity
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
              >
                {amenity}
              </button>
            ))}
            {(search || city || roomType !== "all" || maxRent < 2000 || selectedAmenity) && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto text-xs text-rose-600 hover:underline font-semibold"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse space-y-3">
                <div className="h-48 bg-slate-200 rounded-xl"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl text-center">
            <p className="font-semibold text-sm">{error}</p>
            <button
              onClick={fetchRooms}
              className="mt-3 px-4 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800">No rooms found</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No active room listings match your search criteria. Try expanding your budget or clearing filters.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset Filters
              </button>
              <Link
                href="/rooms/new"
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
              >
                List a Room
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col group"
              >
                {/* Photo Header */}
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  {room.images && room.images.length > 0 ? (
                    <img
                      src={room.images[0]}
                      alt={room.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-teal-50 text-slate-400">
                      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Featured Badge */}
                  {room.is_featured && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-[10px] shadow-md uppercase tracking-wider flex items-center gap-1 z-10">
                      ⭐ Featured
                    </div>
                  )}

                  {/* Rent Pill Badge */}
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm text-slate-900 font-extrabold text-xs shadow-sm z-10">
                    ₹{room.rent_amount.toLocaleString("en-IN")}{" "}
                    <span className="text-[10px] text-slate-500 font-normal">/ mo</span>
                  </div>

                  {/* Room Type Tag */}
                  <div className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-medium capitalize">
                    {room.room_type} Room
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {room.title}
                    </h3>
                    <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-xs text-slate-500 flex items-center">
                        <svg className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{room.neighborhood ? `${room.neighborhood}, ` : ""}{room.city}</span>
                      </p>
                      {room.is_address_locked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          <span>🔒</span> Address Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <span>✓</span> Verified Address
                        </span>
                      )}
                    </div>

                    {room.is_address_locked ? (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Exact address hidden</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowUpgradeModal(true);
                          }}
                          className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          Unlock Full Address &rarr;
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-600 mt-1.5 truncate flex items-center gap-1">
                        <span className="text-slate-400">📍</span>
                        <span className="font-medium text-slate-700">{room.address}</span>
                      </p>
                    )}

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {room.description}
                    </p>

                    {/* Amenities Pills */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {room.amenities.slice(0, 3).map((a) => (
                          <span
                            key={a}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                          >
                            {a}
                          </span>
                        ))}
                        {room.amenities.length > 3 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{room.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Host: <span className="font-semibold text-slate-700">{room.lister_name}</span>
                    </span>
                    <Link
                      href={`/rooms/${room.id}`}
                      className="font-bold text-indigo-600 hover:text-indigo-700 group-hover:translate-x-0.5 transition-transform"
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
