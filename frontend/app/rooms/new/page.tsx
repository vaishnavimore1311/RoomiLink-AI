"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import RoomPhotoUploader from "@/components/RoomPhotoUploader";

export default function NewRoomPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [roomType, setRoomType] = useState("private");
  const [rentAmount, setRentAmount] = useState<number>(750);
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [availableFrom, setAvailableFrom] = useState("Immediate");
  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  ]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(["Wi-Fi", "AC"]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine if user is eligible to create listings
  const isEligible =
    user?.role === "admin" ||
    (user?.subscription?.is_active === true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !address.trim() || !city.trim() || rentAmount <= 0) {
      setErrorMessage("Please fill in title, address, city, and a valid rent amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        city: city.trim(),
        neighborhood: neighborhood.trim(),
        property_type: propertyType,
        room_type: roomType,
        rent_amount: Number(rentAmount),
        deposit_amount: Number(depositAmount),
        available_from: availableFrom.trim() || "Immediate",
        amenities: selectedAmenities,
        images: images.length > 0 ? images : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"],
      };

      const res = await apiRequest("/rooms", {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify(payload),
      });

      if (res.status === 201) {
        router.push("/rooms");
      } else if (res.status === 403 && (res.data as { code?: string } | undefined)?.code === "SUBSCRIPTION_REQUIRED") {
        setErrorMessage(
          "An active subscription is required to list rooms. Please subscribe to a plan first."
        );
      } else {
        setErrorMessage(res.error || "Failed to create room listing.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Subscription paywall view ──
  if (!authLoading && isAuthenticated && !isEligible) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/rooms" className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
            &larr; Back to all rooms
          </Link>

          <div className="mt-6 bg-white border border-slate-200/80 rounded-3xl shadow-sm p-8 sm:p-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Subscription Required
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Listing rooms and properties is a premium feature available to subscribers.
              Upgrade your plan to start connecting with verified tenants and roommates.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95"
              >
                View Plans &amp; Subscribe
              </Link>
              <Link
                href="/rooms"
                className="inline-flex items-center justify-center px-6 py-3 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Browse Rooms Instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/rooms" className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
            &larr; Back to all rooms
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            List a Room or Property
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Post an available room to connect with verified, lifestyle-matched student and professional tenants.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          {/* Section 1: Basic Property Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
              1. Property Location & Details
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Listing Headline</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sunny Private Room with Balcony near Campus"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 402 Oak Street"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Pune"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Neighborhood / Pune Locality</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="e.g., Hinjewadi, Baner, Wakad, Kothrud"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Property Type</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                >
                  <option value="apartment">Apartment / Flat</option>
                  <option value="house">Row House / Villa</option>
                  <option value="condo">Co-Living Studio</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Room Specifics & Pricing */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
              2. Room Specifics & Pricing (₹ INR)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Type</label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                >
                  <option value="private">Private Room</option>
                  <option value="shared">Twin Sharing</option>
                  <option value="master">Master Bedroom (Ensuite)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Rent (₹ INR)</label>
                <input
                  type="number"
                  min="1000"
                  required
                  value={rentAmount}
                  onChange={(e) => setRentAmount(Number(e.target.value))}
                  placeholder="8500"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none font-semibold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Security Deposit (₹ INR)</label>
                <input
                  type="number"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  placeholder="15000"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Move-In Date</label>
              <input
                type="text"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                placeholder="Immediate or Aug 1, 2026"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Room & Property Photos</label>
              <RoomPhotoUploader images={images} onChange={setImages} theme="light" maxPhotos={8} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room Description & House Rules</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe room dimensions, natural light, quiet hour expectations, kitchen privileges..."
                className="w-full p-3 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Section 3: Amenities */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
              3. Amenities & Features
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                "Wi-Fi",
                "In-Unit Laundry",
                "AC",
                "Heating",
                "Furnished",
                "Dishwasher",
                "Parking",
                "Balcony",
                "Gym Access",
              ].map((amenity) => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                    selectedAmenities.includes(amenity)
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 ring-1 ring-indigo-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="mr-1.5">{selectedAmenities.includes(amenity) ? "✓" : "+"}</span>
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t border-slate-100 flex justify-end space-x-3">
            <Link
              href="/rooms"
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Publishing Listing..." : "Publish Room Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
