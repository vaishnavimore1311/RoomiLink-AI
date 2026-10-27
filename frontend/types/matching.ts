export interface RoommateCandidate {
  user_id: number;
  full_name: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  occupation?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  compatibility_score: number;
  strengths: string[];
  frictions: string[];
  lifestyle: {
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
  };
  active_room_share?: {
    room_id: number;
    title: string;
    city: string;
    neighborhood?: string;
    rent_amount: number;
    preferred_gender?: string;
  } | null;
}

export interface MatchBreakdownData {
  candidate: {
    id: number;
    full_name: string;
    occupation?: string | null;
    city?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    lifestyle: RoommateCandidate["lifestyle"];
  };
  compatibility_score: number;
  strengths: string[];
  frictions: string[];
  breakdown: {
    cleanliness: number;
    noise: number;
    sleep: number;
    smoking: number;
    guests: number;
    budget: number;
    pets: number;
    work: number;
  };
}
