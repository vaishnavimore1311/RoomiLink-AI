"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { RoomListing } from "@/types/room";

export default function AdminRoomsListPage() {
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [cityFilter, setCityFilter] = useState("Pune");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cityFilter.trim() && cityFilter !== "all") params.append("city", cityFilter.trim());
      if (search.trim()) params.append("search", search.trim());

      const res = await apiRequest<{ data: RoomListing[] }>(`/admin/rooms?${params.toString()}`, {
        requiresAuth: true,
      });

      if (res.data?.data) {
        setRooms(res.data.data);
      } else {
        setError(res.error || "Failed to load rooms.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch admin rooms.");
    } finally {
      setIsLoading(false);
    }
  }, [cityFilter, search]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const toggleFeatured = async (room: RoomListing) => {
    try {
      const nextFeatured = !room.is_featured;
      const res = await apiRequest(`/admin/rooms/${room.id}`, {
        method: "PUT",
        requiresAuth: true,
        body: { is_featured: nextFeatured },
      });
      if (res.error) {
        setError(res.error);
      } else {
        setRooms((prev) =>
          prev.map((r) => (r.id === room.id ? { ...r, is_featured: nextFeatured } : r))
        );
        setActionSuccess(`Updated featured status for "${room.title}"`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update featured flag.");
    }
  };

  const toggleAvailability = async (room: RoomListing) => {
    try {
      const nextAvail = !room.is_available;
      const res = await apiRequest(`/admin/rooms/${room.id}`, {
        method: "PUT",
        requiresAuth: true,
        body: { is_available: nextAvail },
      });
      if (res.error) {
        setError(res.error);
      } else {
        setRooms((prev) =>
          prev.map((r) => (r.id === room.id ? { ...r, is_available: nextAvail } : r))
        );
        setActionSuccess(`Updated availability status for "${room.title}"`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update availability.");
    }
  };

  const deleteRoom = async (roomId: number, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete listing "${title}"?`)) {
      return;
    }

    try {
      const res = await apiRequest(`/admin/rooms/${roomId}`, {
        method: "DELETE",
        requiresAuth: true,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        setActionSuccess(`Deleted listing "${title}"`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete room.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Manage Room Listings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Total active &amp; featured properties across Pune and platform network.
          </p>
        </div>

        <Link
          href="/admin/rooms/new"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto flex items-center gap-2"
        >
          <span>➕</span> Add Room in Pune
        </Link>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs">
          ✓ {actionSuccess}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCityFilter("Pune")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              cityFilter === "Pune"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            📍 Pune City Only
          </button>
          <button
            onClick={() => setCityFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              cityFilter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            All Cities
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search title, neighborhood..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading listings...
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No listings found matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/50">
                  <th className="py-3 px-4">Property &amp; Locality</th>
                  <th className="py-3 px-4">Rent (Monthly)</th>
                  <th className="py-3 px-4">Room Type</th>
                  <th className="py-3 px-4 text-center">Featured</th>
                  <th className="py-3 px-4 text-center">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-900/40 transition-colors">
                    {/* Property info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={room.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=150"}
                          alt={room.title}
                          className="w-12 h-10 rounded-lg object-cover bg-slate-800 shrink-0"
                        />
                        <div className="overflow-hidden">
                          <p className="font-bold text-white truncate max-w-xs">{room.title}</p>
                          <p className="text-[11px] text-slate-400">
                            {room.neighborhood ? `${room.neighborhood}, ` : ""}{room.city}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Rent */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-400">
                        ₹{room.rent_amount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Deposit: ₹{room.deposit_amount.toLocaleString("en-IN")}
                      </span>
                    </td>

                    {/* Room Type */}
                    <td className="py-3.5 px-4 text-slate-300 capitalize">
                      {room.room_type} Room
                      <span className="text-[10px] text-slate-500 block capitalize">
                        {room.property_type}
                      </span>
                    </td>

                    {/* Featured toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => toggleFeatured(room)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                          room.is_featured
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300"
                        }`}
                      >
                        {room.is_featured ? "⭐ Featured" : "Standard"}
                      </button>
                    </td>

                    {/* Availability toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => toggleAvailability(room)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                          room.is_available
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        }`}
                      >
                        {room.is_available ? "Available" : "Occupied"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/rooms`}
                          target="_blank"
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] border border-slate-800 transition-colors"
                        >
                          View Live ↗
                        </Link>
                        <button
                          onClick={() => deleteRoom(room.id, room.title)}
                          className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 text-[11px] border border-rose-900/50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
