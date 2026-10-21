export interface RoomListing {
  id: number;
  property_id: number;
  title: string;
  description: string;
  address: string;
  is_address_locked?: boolean;
  city: string;
  neighborhood?: string;
  property_type: string;
  room_type: string;
  rent_amount: number;
  deposit_amount: number;
  available_from: string;
  is_available: boolean;
  is_featured?: boolean;
  amenities: string[];
  images: string[];
  lister_id: number;
  lister_name: string;
  lister_email?: string;
  created_at?: string;
  is_favorited?: boolean;
  favorited_at?: string;
}

export interface FavoriteToggleResponse {
  status: string;
  is_favorited: boolean;
  message: string;
  room_id: number;
}

export interface RoomInquiry {
  id: number;
  room_id: number;
  room_title: string;
  room_city?: string;
  room_neighborhood?: string;
  room_rent?: number;
  room_type?: string;
  sender_id: number;
  sender_name: string;
  sender_email: string;
  sender_occupation?: string;
  sender_avatar?: string | null;
  host_id: number;
  message: string;
  status: "pending" | "replied" | "archived";
  is_priority: boolean;
  created_at: string;
}

