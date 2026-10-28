export interface UserProfile {
  id: number;
  user_id: number;
  full_name: string;
  age?: number | null;
  gender?: string | null;
  occupation?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
}

export interface RoommatePreferences {
  id?: number;
  user_id?: number;
  sleep_schedule: string;
  cleanliness_level: number;
  smoking_status: string;
  guest_frequency: string;
  noise_tolerance: string;
  dietary_pref: string;
  work_routine: string;
  pet_tolerance: string;
  budget_min: number;
  budget_max: number;
}

export interface VerificationDocument {
  id: number;
  user_id: number;
  document_type: "government_id" | "college_id" | "property_proof" | string;
  original_filename: string;
  file_size?: number;
  status: "submitted" | "verified" | "rejected" | string;
  uploaded_at?: string;
}

export interface VerificationStatusResponse {
  status: "success" | "error";
  data?: {
    has_uploaded: boolean;
    is_verified: boolean;
    document?: VerificationDocument | null;
  };
  message?: string;
}

import { UserSubscription } from "./subscription";

export interface User {
  id: number;
  email: string;
  role: "seeker" | "lister" | "admin";
  is_verified: boolean;
  ai_consent_enabled: boolean;
  created_at?: string;
  household_id?: number | null;
  profile?: UserProfile | null;
  preference?: RoommatePreferences | null;
  subscription?: UserSubscription | null;
  verification_document?: VerificationDocument | null;
}

export interface AuthResponse {
  status: "success" | "error";
  message?: string;
  access_token?: string;
  user?: User;
}
