export interface RoomListing {
  id: number;
  property_id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  neighborhood?: string;
  property_type: string;
  room_type: string;
  rent_amount: number;
  deposit_amount: number;
  available_from: string;
  is_available: boolean;
  amenities: string[];
  images: string[];
  lister_id: number;
  lister_name: string;
  lister_email?: string;
  created_at?: string;
}
