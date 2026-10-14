export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  target_role: "seeker" | "lister";
  price_inr: number;
  billing_cycle: "monthly" | "quarterly" | "annual";
  features: string[];
  is_active: boolean;
  created_at?: string;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  plan?: SubscriptionPlan | null;
  status: "active" | "expired" | "cancelled" | "superseded";
  is_active: boolean;
  starts_at?: string;
  expires_at?: string;
  payment_reference?: string;
  created_at?: string;
}

export interface AdminStats {
  users: {
    total: number;
    seekers: number;
    listers: number;
    admins: number;
  };
  listings: {
    total_properties: number;
    total_rooms: number;
    pune_rooms: number;
  };
  subscriptions: {
    active_count: number;
    total_revenue_inr: number;
  };
}

export interface SubscriberRecord {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  plan_id: number;
  plan_name: string;
  plan_slug: string;
  price_inr: number;
  status: string;
  is_active: boolean;
  starts_at?: string;
  expires_at?: string;
  payment_reference?: string;
  created_at?: string;
}
