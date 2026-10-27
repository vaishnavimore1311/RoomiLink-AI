"use client";

import React, { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { VerificationDocument } from "@/types/auth";

interface PhotoIdUploaderProps {
  initialDocument?: VerificationDocument | null;
  isVerified?: boolean;
  onUploadSuccess?: (doc: VerificationDocument) => void;
}

const DOCUMENT_CATEGORIES = [
  {
    id: "government_id",
    name: "Government ID",
    desc: "Aadhaar Card, Passport, Driver's License, or Voter ID",
    icon: "🪪",
  },
  {
    id: "college_id",
    name: "College / Student ID",
    desc: "University ID Card, Student Admission Pass, or Institute ID",
    icon: "🎓",
  },
  {
    id: "property_proof",
    name: "Property Proof",
    desc: "Electricity Bill, Society Maintenance Receipt, or Allotment Letter",
    icon: "📜",
  },
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function PhotoIdUploader({
  initialDocument = null,
  isVerified = false,
  onUploadSuccess,
}: PhotoIdUploaderProps) {
  const [currentDoc, setCurrentDoc] = useState<VerificationDocument | null>(initialDocument);
  const [documentType, setDocumentType] = useState<string>(initialDocument?.document_type || "government_id");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showReplaceForm, setShowReplaceForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if initialDocument updates from parent
  useEffect(() => {
    if (initialDocument) {
      setCurrentDoc(initialDocument);
      setDocumentType(initialDocument.document_type || "government_id");
    }
  }, [initialDocument]);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateAndSelectFile = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError(`File size (${sizeMb}MB) exceeds the 5MB limit. Please choose a smaller image.`);
      return;
    }

    // Check extension
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) && !file.type.startsWith("image/")) {
      setUploadError("Unsupported format. Please select an image file (JPG, JPEG, PNG, or WEBP).");
      return;
    }

    // Revoke previous preview if any
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCancelSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select an ID image file before submitting.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("document_type", documentType);

      const res = await apiRequest<{ status: string; message: string; data: VerificationDocument }>(
        "/auth/verification/upload-id",
        {
          method: "POST",
          requiresAuth: true,
          body: formData,
        }
      );

      if (res.data?.data) {
        setCurrentDoc(res.data.data);
        setUploadSuccess(res.data.message || "Photo ID submitted successfully for verification.");
        setShowReplaceForm(false);
        handleCancelSelection();

        if (onUploadSuccess) {
          onUploadSuccess(res.data.data);
        }
      } else {
        setUploadError(res.error || "Failed to upload Photo ID. Please check your network connection.");
      }
    } catch (err: any) {
      setUploadError(err?.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCategoryName = (type?: string) => {
    const found = DOCUMENT_CATEGORIES.find((c) => c.id === type);
    return found ? found.name : type?.replace("_", " ").toUpperCase() || "Government ID";
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🪪</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Photo ID &amp; Identity Verification
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Submit a Government ID, College Student ID, or Property Proof for platform trust verification.
          </p>
        </div>

        {/* Verification Status Chip */}
        <div className="flex items-center space-x-2">
          {isVerified ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="mr-1.5">✓</span> Verified Member
            </span>
          ) : currentDoc ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="mr-1.5">⏳</span> ID Submitted (Pending Review)
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <span className="mr-1.5">⚠️</span> Not Submitted
            </span>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {uploadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-base">✓</span>
            <span className="font-semibold">{uploadSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-sm px-2 py-0.5"
            aria-label="Dismiss success message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification */}
      {uploadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-base">✕</span>
            <span className="font-semibold">{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-700 hover:text-rose-900 font-bold text-sm px-2 py-0.5"
            aria-label="Dismiss error message"
          >
            ✕
          </button>
        </div>
      )}

      {/* STATE 1: ALREADY SUBMITTED (SHOW CURRENT SUBMISSION & REPLACE OPTION) */}
      {currentDoc && !showReplaceForm ? (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl shadow-xs">
                📄
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    {formatCategoryName(currentDoc.document_type)}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {currentDoc.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-mono">
                  {currentDoc.original_filename}
                </p>
                <p className="text-[11px] text-slate-400">
                  {formatFileSize(currentDoc.file_size)} &bull; Submitted on{" "}
                  {currentDoc.uploaded_at
                    ? new Date(currentDoc.uploaded_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Recently"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowReplaceForm(true);
                setUploadError(null);
                setUploadSuccess(null);
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-xs transition"
            >
              🔄 Replace / Update Photo ID
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Your identification document is on file. When an administrator verifies your submission, your profile and property listings will automatically display the Verified badge.
          </p>
        </div>
      ) : (
        /* STATE 2: UPLOAD OR REPLACE FORM */
        <form onSubmit={handleSubmitUpload} className="space-y-6">
          {showReplaceForm && currentDoc && (
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
              <span>You are updating your previously submitted identification document.</span>
              <button
                type="button"
                onClick={() => {
                  setShowReplaceForm(false);
                  handleCancelSelection();
                }}
                className="font-bold underline text-amber-800 hover:text-amber-950"
              >
                Cancel Update
              </button>
            </div>
          )}

          {/* 1. Category Selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Select ID Document Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DOCUMENT_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setDocumentType(cat.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    documentType === cat.id
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-bold text-xs text-slate-900">{cat.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal line-clamp-2">
                    {cat.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Upload / Preview Area */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Upload Photo of Identification Document
            </label>

            {!selectedFile ? (
              /* Drag & Drop File Picker Box */
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-indigo-600 bg-indigo-50/50 scale-[1.01]"
                    : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/60 bg-slate-50/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mx-auto mb-3 shadow-xs">
                  📸
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Click to select or drag &amp; drop photo ID
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Supports JPG, JPEG, PNG, or WEBP (Max 5MB)
                </p>
                <div className="mt-4">
                  <span className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition">
                    Browse File
                  </span>
                </div>
              </div>
            ) : (
              /* Selected File Preview Box */
              <div className="border border-indigo-200 bg-indigo-50/30 rounded-3xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Thumbnail Preview */}
                  {previewUrl && (
                    <div className="w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs shrink-0 flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Photo ID Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* File Metadata */}
                  <div className="space-y-1 text-center sm:text-left grow">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="font-bold text-sm text-slate-900 truncate max-w-xs">
                        {selectedFile.name}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                        Ready to upload
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      File Size: {formatFileSize(selectedFile.size)} &bull; Type: {formatCategoryName(documentType)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Ensure your full name, photo, and details are sharp and legible before submitting.
                    </p>
                  </div>

                  {/* Cancel / Reselect Button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={handleCancelSelection}
                      disabled={isUploading}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                    >
                      ✕ Choose Different Photo
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition active:scale-95"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Uploading ID Securely...
                      </>
                    ) : (
                      "✓ Upload &amp; Submit Photo ID"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Security & Privacy Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3 text-slate-600 text-xs">
        <span className="text-base shrink-0 mt-0.5">🔒</span>
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">Privacy &amp; Security Protected</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Your document photo is stored in an isolated, private directory on the server and is never accessible through public URLs or visible to other platform users. Submitting an ID does not automatically verify your account; platform administrators review submissions against verification standards.
          </p>
        </div>
      </div>
    </div>
  );
}
