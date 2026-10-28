"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { RoomListing } from "@/types/room";

// ─── Edit Listing Modal (Issue #92) ─────────────────────────────────────────

interface EditListingModalProps {
  room: RoomListing;
  onClose: () => void;
  onSaved: (updated: RoomListing) => void;
}

function EditListingModal({ room, onClose, onSaved }: EditListingModalProps) {
  const [title, setTitle] = useState(room.title);
  const [neighborhood, setNeighborhood] = useState(room.neighborhood ?? "");
  const [rentAmount, setRentAmount] = useState(String(room.rent_amount));
  const [depositAmount, setDepositAmount] = useState(
    String(room.deposit_amount)
  );
  const [isAvailable, setIsAvailable] = useState(room.is_available);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const parsedRent = parseFloat(rentAmount);
    const parsedDeposit = parseFloat(depositAmount);

    if (isNaN(parsedRent) || parsedRent < 0) {
      setError("Rent amount must be a valid non-negative number.");
      return;
    }
    if (isNaN(parsedDeposit) || parsedDeposit < 0) {
      setError("Deposit amount must be a valid non-negative number.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await apiRequest<{ message: string }>(
        `/admin/rooms/${room.id}`,
        {
          method: "PUT",
          requiresAuth: true,
          body: {
            title: title.trim(),
            neighborhood: neighborhood.trim(),
            rent_amount: parsedRent,
            deposit_amount: parsedDeposit,
            is_available: isAvailable,
          },
        }
      );

      if (res.error) {
        setError(res.error);
      } else {
        onSaved({
          ...room,
          title: title.trim(),
          neighborhood: neighborhood.trim() || undefined,
          rent_amount: parsedRent,
          deposit_amount: parsedDeposit,
          is_available: isAvailable,
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
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
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 bg-indigo-50 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm">
              ✏️ Edit Listing
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono truncate max-w-[280px]">
              Room #{room.id} · Property #{room.property_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none font-bold flex-shrink-0"
            aria-label="Close edit modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="edit-title"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1"
            >
              Listing Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g. Tech Haven Flatshare — Phase 1 IT Park"
            />
          </div>

          {/* Neighborhood */}
          <div>
            <label
              htmlFor="edit-neighborhood"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1"
            >
              Neighborhood / Locality
            </label>
            <input
              id="edit-neighborhood"
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="e.g. Hinjewadi, Baner, Wakad, Kothrud"
            />
          </div>

          {/* Rent & Deposit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="edit-rent"
                className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Monthly Rent (₹)
              </label>
              <input
                id="edit-rent"
                type="number"
                min="0"
                step="100"
                required
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label
                htmlFor="edit-deposit"
                className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Deposit (₹)
              </label>
              <input
                id="edit-deposit"
                type="number"
                min="0"
                step="100"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Availability toggle */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Availability
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isAvailable ? "Room is currently available" : "Room is currently occupied"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable((v) => !v)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1 ${
                isAvailable
                  ? "bg-emerald-500 border-emerald-500"
                  : "bg-slate-300 border-slate-300"
              }`}
              aria-pressed={isAvailable}
              aria-label="Toggle availability"
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  isAvailable ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Actions */}
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
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-100 transition-all active:scale-95"
            >
              {isSaving ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Admin Rooms Page ────────────────────────────────────────────────────

export default function AdminRoomsListPage() {
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [cityFilter, setCityFilter] = useState("Pune");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit Listing modal state (Issue #92)
  const [editTarget, setEditTarget] = useState<RoomListing | null>(null);

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

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

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
        showSuccess(`Updated featured status for "${room.title}"`);
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
        showSuccess(`Updated availability status for "${room.title}"`);
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
        showSuccess(`Deleted listing "${title}"`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete room.");
    }
  };

  // Handle Edit Listing save (Issue #92)
  const handleEditSaved = (updated: RoomListing) => {
    setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditTarget(null);
    showSuccess(`Listing "${updated.title}" updated successfully.`);
  };

  return (
    <div className="space-y-6">
      {/* ── Edit Listing Modal ─────────────────────────────────────────── */}
      {editTarget && (
        <EditListingModal
          room={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      )}

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
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-start justify-between gap-2">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold text-sm leading-none flex-shrink-0"
          >
            ×
          </button>
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
                    {/* Property info — title no longer truncated (Issue #92) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={room.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=150"}
                          alt={room.title}
                          className="w-12 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200/80 shrink-0 mt-0.5"
                        />
                        <div>
                          {/* Issue #92: removed truncate max-w-xs so full title is visible */}
                          <p className="font-bold text-slate-900 leading-snug">{room.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
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
                        {/* Edit Listing button (Issue #92) */}
                        <button
                          onClick={() => setEditTarget(room)}
                          title={`Edit listing: ${room.title}`}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold border border-indigo-200 transition-colors"
                        >
                          ✏️ Edit
                        </button>
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
