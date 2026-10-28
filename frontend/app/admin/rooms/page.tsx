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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Manage Room Listings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Total active &amp; featured properties across Pune and platform network.
          </p>
        </div>

        <Link
          href="/admin/rooms/new"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-100 transition-all self-start sm:self-auto flex items-center gap-2 active:scale-95"
        >
          <span>➕</span> Add Room in Pune
        </Link>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold">
          ✓ {actionSuccess}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCityFilter("Pune")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              cityFilter === "Pune"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            📍 Pune City Only
          </button>
          <button
            onClick={() => setCityFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              cityFilter === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading listings...
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No listings found matching filter criteria.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Property &amp; Locality</th>
                  <th className="py-3 px-4">Rent (Monthly)</th>
                  <th className="py-3 px-4">Room Type</th>
                  <th className="py-3 px-4 text-center">Featured</th>
                  <th className="py-3 px-4 text-center">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Property info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={room.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=150"}
                          alt={room.title}
                          className="w-12 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200/80 shrink-0"
                        />
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 truncate max-w-xs">{room.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {room.neighborhood ? `${room.neighborhood}, ` : ""}{room.city}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Rent */}
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-emerald-700 text-sm">
                        ₹{room.rent_amount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Deposit: ₹{room.deposit_amount.toLocaleString("en-IN")}
                      </span>
                    </td>

                    {/* Room Type */}
                    <td className="py-3.5 px-4 text-slate-700 capitalize font-medium">
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
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
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
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-rose-100 text-rose-800 border-rose-300"
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
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors"
                        >
                          View Live ↗
                        </Link>
                        <button
                          onClick={() => deleteRoom(room.id, room.title)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold border border-rose-200 transition-colors"
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
