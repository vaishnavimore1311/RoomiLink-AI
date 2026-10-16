"use client";

import React, { useState, useRef } from "react";
import { apiRequest } from "@/lib/api";

interface RoomPhotoUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  theme?: "light" | "dark";
  maxPhotos?: number;
}

export default function RoomPhotoUploader({
  images,
  onChange,
  theme = "light",
  maxPhotos = 8,
}: RoomPhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === "dark";

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setUploadSuccess(null);

    const validFiles: File[] = [];
    const validExtensions = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (validExtensions.includes(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`File "${file.name}" exceeds the 10MB limit.`);
          return;
        }
        validFiles.push(file);
      } else {
        setUploadError(`File "${file.name}" has an unsupported format. Please upload JPG, PNG, or WEBP.`);
        return;
      }
    }

    if (images.length + validFiles.length > maxPhotos) {
      setUploadError(`You can upload up to ${maxPhotos} photos in total.`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await apiRequest<{ status: string; urls: string[]; message: string }>(
        "/rooms/upload-photos",
        {
          method: "POST",
          requiresAuth: true,
          body: formData,
        }
      );

      if (res.data?.urls && Array.isArray(res.data.urls)) {
        const newImages = [...images, ...res.data.urls];
        onChange(newImages);
        setUploadSuccess(`Successfully uploaded ${res.data.urls.length} photo(s).`);
        setTimeout(() => setUploadSuccess(null), 4000);
      } else {
        setUploadError(res.error || "Failed to upload photo. Please check your connection.");
      }
    } catch (err: any) {
      setUploadError(err?.message || "An error occurred during file upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removePhoto = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const makeCover = (indexToCover: number) => {
    if (indexToCover === 0) return;
    const target = images[indexToCover];
    const rest = images.filter((_, idx) => idx !== indexToCover);
    onChange([target, ...rest]);
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (images.length >= maxPhotos) {
      setUploadError(`Maximum ${maxPhotos} photos reached.`);
      return;
    }
    onChange([...images, trimmed]);
    setUrlInput("");
    setShowUrlInput(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload Box / Drag & Drop Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-2xl border-2 border-dashed transition-all p-6 text-center flex flex-col items-center justify-center cursor-pointer ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/20 scale-[0.99]"
            : isDark
            ? "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
            : "border-slate-300 bg-slate-50/70 hover:border-indigo-400 hover:bg-indigo-50/10"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner ${
            isDark ? "bg-slate-800 text-indigo-400" : "bg-white text-indigo-600 shadow-sm"
          }`}
        >
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>

        <div className="space-y-1">
          <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
            {isUploading ? "Uploading photos to server..." : "Click to upload or drag & drop room photos"}
          </p>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Supports JPG, PNG, WEBP up to 10MB each (Up to {maxPhotos} photos)
          </p>
        </div>

        <button
          type="button"
          disabled={isUploading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-95 disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Select Photos From Computer"}
        </button>
      </div>

      {/* Notifications */}
      {uploadError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-xl flex items-center justify-between">
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="ml-2 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs rounded-xl flex items-center justify-between">
          <span>{uploadSuccess}</span>
          <button type="button" onClick={() => setUploadSuccess(null)} className="ml-2 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Photo Grid Preview */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Uploaded Photos ({images.length}/{maxPhotos})
            </span>
            <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              First photo is the Cover Image
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((imgUrl, idx) => (
              <div
                key={`${imgUrl}-${idx}`}
                className={`group relative rounded-xl overflow-hidden aspect-video border transition-all ${
                  idx === 0
                    ? isDark
                      ? "ring-2 ring-indigo-500 border-indigo-500"
                      : "ring-2 ring-indigo-600 border-indigo-600"
                    : isDark
                    ? "border-slate-800 bg-slate-900"
                    : "border-slate-200 bg-white"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  alt={`Room preview ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400";
                  }}
                />

                {/* Cover badge */}
                {idx === 0 && (
                  <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    Cover
                  </span>
                )}

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => makeCover(idx)}
                      title="Set as Cover Photo"
                      className="px-2 py-1 bg-white/90 hover:bg-white text-slate-800 rounded-lg text-[10px] font-bold shadow"
                    >
                      Make Cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    title="Remove Photo"
                    className="p-1.5 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg text-xs shadow"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative: Add by Direct URL toggle */}
      <div className="pt-2">
        {!showUrlInput ? (
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            className={`text-xs font-semibold hover:underline flex items-center gap-1 ${
              isDark ? "text-indigo-400" : "text-indigo-600"
            }`}
          >
            <span>+ Or add photo by Web URL</span>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className={`flex-1 px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
                    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                }`}
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
              >
                Add URL
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className={`px-3 py-2 text-xs font-medium rounded-xl border ${
                  isDark
                    ? "border-slate-800 text-slate-400 hover:text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
