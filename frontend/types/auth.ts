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
}

export interface AuthResponse {
  status: "success" | "error";
  message?: string;
  access_token?: string;
  user?: User;
}
