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
  const [listingPurpose, setListingPurpose] = useState<"landlord" | "flatmate_share">("landlord");
  const [currentOccupants, setCurrentOccupants] = useState<number>(1);
  const [maxOccupants, setMaxOccupants] = useState<number>(2);
  const [preferredGender, setPreferredGender] = useState<string>("any");
  const [utilitySplitDesc, setUtilitySplitDesc] = useState<string>("");
  const [householdId, setHouseholdId] = useState<number | null>(null);
  const [isFromHousehold, setIsFromHousehold] = useState(false);
  const [totalRoomRent, setTotalRoomRent] = useState<number>(16000);
  const [rentAmount, setRentAmount] = useState<number>(8000);
  const [depositAmount, setDepositAmount] = useState<number>(15000);
  const [availableFrom, setAvailableFrom] = useState("Immediate");
  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  ]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(["Wi-Fi", "AC"]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPurposeLocked, setIsPurposeLocked] = useState(false);

  const [quota, setQuota] = useState<{
    can_list: boolean;
    existing_room_count: number;
    max_listings: number | null;
    is_unlimited: boolean;
  } | null>(null);
  const [isQuotaLoading, setIsQuotaLoading] = useState(true);

  useEffect(() => {
    async function checkQuota() {
      if (!isAuthenticated) return;
      try {
        const res = await apiRequest<{ data: any }>("/rooms/quota", { requiresAuth: true });
        if (res.data?.data) {
          setQuota(res.data.data);
        }
      } catch (err) {
        console.error("Quota check:", err);
      } finally {
        setIsQuotaLoading(false);
      }
    }
    checkQuota();
  }, [isAuthenticated]);

  // Determine if user is eligible to create listings
  const isEligible =
    user?.role === "admin" ||
    (user?.subscription?.is_active === true) ||
    (quota !== null ? quota.can_list : false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }

    if (user?.role === "lister") {
      setListingPurpose("landlord");
      setIsPurposeLocked(true);
      return;
    }

    let isShareMode = user?.role === "seeker";

    // Check if query params specify flatmate_share mode or household pre-fills
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("purpose") === "flatmate_share" || params.get("mode") === "share") {
        isShareMode = true;
      }
      if (params.get("source") === "household") {
        setIsFromHousehold(true);
      }
      if (params.get("title")) {
        setTitle(params.get("title") || "");
      }
      if (params.get("address")) {
        setAddress(params.get("address") || "");
      }
      if (params.get("city")) {
        setCity(params.get("city") || "");
      }
      if (params.get("household_id")) {
        const hhId = parseInt(params.get("household_id") || "0");
        if (hhId > 0) setHouseholdId(hhId);
      }
    }

    if (isShareMode) {
      setListingPurpose("flatmate_share");
      setRoomType("shared");
      setIsPurposeLocked(true);
    }
  }, [authLoading, isAuthenticated, user, router]);

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
      const isShare = user?.role !== "lister" && (isPurposeLocked || user?.role === "seeker" || listingPurpose === "flatmate_share");
      const payload = {
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        city: city.trim(),
        neighborhood: neighborhood.trim(),
        property_type: propertyType,
        room_type: isShare ? "shared" : roomType,
        listing_purpose: isShare ? "flatmate_share" : listingPurpose,
        current_occupants: Number(currentOccupants),
        max_occupants: Number(maxOccupants),
        preferred_gender: preferredGender,
        utility_split_desc: utilitySplitDesc.trim(),
        household_id: householdId,
        rent_amount: Number(rentAmount),
        total_room_rent: Number(isShare ? totalRoomRent : rentAmount),
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
  if (!authLoading && !isQuotaLoading && isAuthenticated && !isEligible) {
    const isListerQuotaReached = user?.role === "lister" && quota && quota.existing_room_count >= 1;

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/rooms" className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
            &larr; Back to all rooms
          </Link>

          <div className="mt-6 bg-white border border-slate-200/80 rounded-3xl shadow-sm p-8 sm:p-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center text-3xl">
              🔒
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isListerQuotaReached ? "Free Listing Limit Reached (1/1 Active)" : "Subscription Required"}
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {isListerQuotaReached
                ? "Your Basic Lister account includes 1 free active room listing. You are currently using your free quota. Upgrade to Featured Host to publish unlimited properties and boost your listings across Pune!"
                : "Listing rooms and space-shares is a premium feature. Upgrade your plan to connect with verified roommates and tenants across Pune."}
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95"
              >
                {isListerQuotaReached ? "Upgrade to Featured Host (₹999/mo) →" : "View Plans & Subscribe →"}
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

        {user?.role !== "lister" && isFromHousehold && (
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-start gap-3 shadow-sm">
            <span className="text-xl">🏠</span>
            <div>
              <p className="text-xs font-bold text-purple-900">
                Pre-filled from your Household Hub
              </p>
              <p className="text-xs text-purple-700 mt-0.5">
                We pre-filled your flat address and space-share settings from your household. Review details, adjust rent split, and post!
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          {/* Dual-Mode Selector: Landlord vs Existing Tenant Space Share */}
          <div className="space-y-3 pb-6 border-b border-slate-100">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              {user?.role === "lister" || isPurposeLocked || user?.role === "seeker" ? "Listing Mode" : "Select Listing Type"}
            </label>
            {user?.role === "lister" ? (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start space-x-3.5 shadow-xs text-white">
                <span className="text-2xl mt-0.5">🏢</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-bold text-white">
                      Landlord / Property Owner Listing
                    </p>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500 text-slate-950">
                      Verified Host Mode
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-snug">
                    You are listing a private room, studio, or managed property. Prospective tenant inquiries will route directly to your Host Inquiry Inbox.
                  </p>
                </div>
              </div>
            ) : isPurposeLocked || user?.role === "seeker" ? (
              <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200/90 flex items-start space-x-3.5 shadow-xs">
                <span className="text-2xl mt-0.5">🤝</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-bold text-indigo-950">
                      Resident Flatmate Space Share
                    </p>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-indigo-600 text-white">
                      Verified Roommate
                    </span>
                  </div>
                  <p className="text-xs text-indigo-700 mt-1 leading-snug">
                    You live here and are sharing a room/rent with an AI-compatible roommate.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setListingPurpose("landlord")}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start space-x-3.5 ${
                    listingPurpose === "landlord"
                      ? "border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/10"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-2xl mt-0.5">🏢</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className={`text-sm font-bold ${listingPurpose === "landlord" ? "text-white" : "text-slate-900"}`}>
                        Landlord / Property Owner
                      </p>
                    </div>
                    <p className={`text-xs mt-1 leading-snug ${listingPurpose === "landlord" ? "text-slate-300" : "text-slate-500"}`}>
                      Renting out an entire private room, studio, or full property.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setListingPurpose("flatmate_share");
                    setRoomType("shared");
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start space-x-3.5 ${
                    listingPurpose === "flatmate_share"
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-600/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-2xl mt-0.5">🤝</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className={`text-sm font-bold ${listingPurpose === "flatmate_share" ? "text-white" : "text-slate-900"}`}>
                        I Live Here &amp; Need a Roommate
                      </p>
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                        listingPurpose === "flatmate_share"
                          ? "bg-white/20 text-white"
                          : "bg-indigo-100 text-indigo-700"
                      }`}>
                        Share Rent
                      </span>
                    </div>
                    <p className={`text-xs mt-1 leading-snug ${listingPurpose === "flatmate_share" ? "text-indigo-100" : "text-slate-500"}`}>
                      Have an empty bed/space in your room to split rent and domestic bills.
                    </p>
                  </div>
                </button>
              </div>
            )}

            {user?.role !== "lister" && listingPurpose === "flatmate_share" && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-start space-x-3 mt-3">
                <span className="text-lg">✨</span>
                <div className="text-xs text-indigo-950 leading-relaxed">
                  <p className="font-bold text-indigo-900">Peer-to-Peer Flatmate Sharing Active</p>
                  <p className="text-indigo-700 mt-0.5">
                    Your verified lifestyle profile will be automatically linked to this room listing. Prospective roommates will see your sleep routine, cleanliness habits, and live AI compatibility score before applying!
                  </p>
                </div>
              </div>
            )}
          </div>

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
              {user?.role !== "lister" && listingPurpose === "flatmate_share" ? "2. Roommate Sharing & Rent Split (₹ INR)" : "2. Room Specifics & Pricing (₹ INR)"}
            </h2>

            {/* Flatmate Room-Share Specific Fields */}
            {user?.role !== "lister" && listingPurpose === "flatmate_share" && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Current Occupants Living Here
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={currentOccupants}
                      onChange={(e) => setCurrentOccupants(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">E.g., 1 (you currently living in the room)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Total Room Capacity (Beds)
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={maxOccupants}
                      onChange={(e) => {
                        const occupants = Math.max(2, Number(e.target.value));
                        setMaxOccupants(occupants);
                        setRentAmount(Math.round(totalRoomRent / occupants));
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Total beds (e.g., 2 for twin-sharing)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preferred Flatmate Gender
                    </label>
                    <select
                      value={preferredGender}
                      onChange={(e) => setPreferredGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                    >
                      <option value="any">Any Gender</option>
                      <option value="female">Female Only</option>
                      <option value="male">Male Only</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">Gender preference for the shared room</p>
                  </div>
                </div>

                {/* Total Actual Room Rent & Equal Split Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Total Actual Room Rent (₹ INR) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="500"
                      required
                      value={totalRoomRent}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setTotalRoomRent(val);
                        setRentAmount(Math.round(val / (maxOccupants || 2)));
                      }}
                      placeholder="16000"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      The total lease rent payable for the entire room.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-indigo-200/80 shadow-xs flex flex-col justify-center">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <span>⚡</span> Automated Equal Rent Split
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-black text-emerald-600">
                        ₹{rentAmount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        / month per person ({Math.round(100 / (maxOccupants || 2))}% split)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Calculated as ₹{totalRoomRent.toLocaleString("en-IN")} ÷ {maxOccupants} roommates
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Utility &amp; Bill Split Details (Optional)
                  </label>
                  <input
                    type="text"
                    value={utilitySplitDesc}
                    onChange={(e) => setUtilitySplitDesc(e.target.value)}
                    placeholder="e.g., Rent ₹8,000 + Wi-Fi, electricity & maid split equally 50/50"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Explain how ongoing household expenses (Wi-Fi, cleaning, utilities) will be divided.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Type</label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                >
                  <option value="shared">Twin Sharing</option>
                  <option value="private">Private Room</option>
                  <option value="master">Master Bedroom (Ensuite)</option>
                </select>
              </div>

              {listingPurpose === "flatmate_share" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Roommate&apos;s Split Rent (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="500"
                    required
                    value={rentAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRentAmount(val);
                      setTotalRoomRent(val * (maxOccupants || 2));
                    }}
                    placeholder="8000"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none font-bold text-emerald-700 bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Equal share billed to prospective roommate.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Rent (₹ INR)</label>
                  <input
                    type="number"
                    min="500"
                    required
                    value={rentAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRentAmount(val);
                      setTotalRoomRent(val);
                    }}
                    placeholder="15000"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none font-bold text-slate-900 bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Full monthly room rent.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {user?.role !== "lister" && listingPurpose === "flatmate_share" ? "Roommate Deposit Share (₹ INR)" : "Security Deposit (₹ INR)"}
                </label>
                <input
                  type="number"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  placeholder="15000"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white font-semibold"
                />
                <p className="text-[10px] text-slate-500 mt-1">One-time refundable security deposit.</p>
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
              className={`px-6 py-2.5 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                listingPurpose === "flatmate_share"
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                  : "bg-slate-900 hover:bg-slate-800 shadow-slate-100"
              }`}
            >
              {isSubmitting
                ? "Publishing Listing..."
                : listingPurpose === "flatmate_share"
                ? "Publish Flatmate Room Share"
                : "Publish Property Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
