"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import RoomPhotoUploader from "@/components/RoomPhotoUploader";

const PUNE_LOCALITIES = [
  "Hinjewadi",
  "Baner",
  "Wakad",
  "Viman Nagar",
  "Kothrud",
  "Kharadi",
  "Koregaon Park",
  "Aundh",
  "Magarpatta",
  "Hadapsar",
  "Pimple Saudagar",
  "Shivaji Nagar",
  "Senapati Bapat Road",
  "Bavdhan"
];

const PRESET_AMENITIES = [
  "High-Speed Wi-Fi",
  "Power Backup / Inverter",
  "Air Conditioner (AC)",
  "Daily Housekeeping / Maid",
  "Cook / Tiffin Available",
  "Washing Machine",
  "2-Wheeler Parking",
  "4-Wheeler Parking",
  "Attached Bathroom",
  "Gated 24/7 Security",
  "Geyser / Water Heater",
  "Water Purifier (RO)",
  "Swimming Pool & Gym",
  "Vegetarian Friendly"
];

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"
];

export default function AdminNewRoomPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Pune");
  const [neighborhood, setNeighborhood] = useState("Hinjewadi");
  const [propertyType, setPropertyType] = useState("apartment");
  const [roomType, setRoomType] = useState("private");
  const [rentAmount, setRentAmount] = useState<number | string>(9500);
  const [depositAmount, setDepositAmount] = useState<number | string>(18000);
  const [availableFrom, setAvailableFrom] = useState("Immediate");
  const [isFeatured, setIsFeatured] = useState(true);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "High-Speed Wi-Fi",
    "Power Backup / Inverter",
    "2-Wheeler Parking",
    "Gated 24/7 Security"
  ]);
  const [images, setImages] = useState<string[]>([SAMPLE_IMAGES[0]]);

  const toggleAmenity = (item: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
        available_from: availableFrom,
        is_available: true,
        is_featured: isFeatured,
        amenities: selectedAmenities,
        images: images.length > 0 ? images : [SAMPLE_IMAGES[0]]
      };

      const res = await apiRequest("/admin/rooms", {
        method: "POST",
        requiresAuth: true,
        body: payload
      });

      if (res.error) {
        setError(res.error);
      } else {
        router.push("/admin/rooms");
      }
    } catch (err: any) {
      setError(err.message || "Failed to add room listing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/admin/rooms" className="hover:text-indigo-600 font-medium">&larr; Rooms</Link>
            <span>/</span>
            <span>Add Pune Listing</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Publish New Room in Pune
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create an official verified property listing with Pune locality tags, amenities, and pricing.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Section 1: Property Identity */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
            1. Property &amp; Pune Locality
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Listing Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sunny Private Room in Blue Ridge Hinjewadi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pune Locality / Neighborhood *
              </label>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {PUNE_LOCALITIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Society &amp; Street Address *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tower 8, Godrej Elements, Datta Mandir Road"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description &amp; Highlights
            </label>
            <textarea
              rows={3}
              placeholder="Highlight proximity to IT parks, metro, cook availability, lifestyle vibe..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </div>

        {/* Section 2: Room Specification & Pricing */}
        <div className="space-y-4 pt-4 border-t border-slate-200/80">
          <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            2. Room Specs &amp; Pricing (INR ₹)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Room Type
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="private">Private Room</option>
                <option value="master">Master Bedroom (Attached Bath)</option>
                <option value="shared">Twin Sharing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="apartment">Gated Society Flat</option>
                <option value="house">Row House / Villa</option>
                <option value="condo">Co-Living Studio</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Monthly Rent (₹) *
              </label>
              <input
                type="number"
                required
                min={1000}
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-emerald-700 font-extrabold text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Security Deposit (₹)
              </label>
              <input
                type="number"
                min={0}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Availability
              </label>
              <input
                type="text"
                placeholder="e.g. Immediate or 1st Nov"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                id="featuredCheck"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500"
              />
              <label htmlFor="featuredCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                ⭐ Mark as Featured Listing (Top ranking in Pune search)
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Amenities Selection */}
        <div className="space-y-4 pt-4 border-t border-slate-200/80">
          <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            3. Local Amenities Checklist
          </h2>
          <div className="flex flex-wrap gap-2">
            {PRESET_AMENITIES.map((amenity) => {
              const selected = selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  {selected ? "✓ " : "+ "}
                  {amenity}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Property Photos & Upload */}
        <div className="space-y-4 pt-4 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              4. Property Photos &amp; Upload
            </h2>
            <span className="text-[11px] text-slate-500">Upload photos from computer or select presets</span>
          </div>

          <RoomPhotoUploader
            images={images}
            onChange={setImages}
            theme="light"
            maxPhotos={8}
          />

          <div className="flex items-center gap-2 overflow-x-auto pt-2">
            <span className="text-[11px] text-slate-500 shrink-0">Preset Pune Samples:</span>
            {SAMPLE_IMAGES.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (!images.includes(img)) {
                    setImages([...images, img]);
                  }
                }}
                className="relative w-12 h-10 rounded-lg overflow-hidden border border-slate-200 opacity-80 hover:opacity-100 hover:border-indigo-600 shrink-0 transition-all shadow-2xs"
                title="Add sample photo to listing"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="thumb" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-6 border-t border-slate-200/80 flex items-center justify-end gap-3">
          <Link
            href="/admin/rooms"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
          >
            {isSubmitting ? "Publishing Listing..." : "Publish Pune Listing 🚀"}
          </button>
        </div>
      </form>
    </div>
  );
}
