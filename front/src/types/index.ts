export interface User {
  id?: number;
  username: string;
  email?: string;
  phone?: string;
  is_staff: boolean;
  is_superuser?: boolean;
  roles?: Role[];
}

export interface Role {
  id: number;
  name: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  roles: Role[];
}

export interface Event {
  id: number;
  title: string;
  desc: string;
  type: "online" | "offline" | "hybrid";
  visibility: "public" | "private";
  building?: string;
  floor?: string;
  room?: string;
  organizer_side: string;
  allowed_roles: Role[];
  allowed_roles_ids?: number[];
  start_date: string;
  end_date: string;
  max_participants: number;
  participant_count: number;
  is_joined: boolean;
  images?: EventImage[];
  agendas?: AgendaItem[]; // Backend-də related_name 'agendas' olduğu üçün düzəldildi
  created_date?: string;
  
  // --- REYTİNQ SAHƏLƏRİ (YENİ) ---
  average_rating: number; 
  reviews_count: number;
  reviews?: Review[]; // Əgər detallarda rəyləri göstərmək istəsən
}

// --- REY İNTERFEYSİ (YENİ) ---
export interface Review {
  id: number;
  event: number;
  user: string; // Serializer-də StringRelatedField olduğu üçün username gələcək
  rating: number;
  comment?: string;
  created_at: string;
}

export interface EventImage {
  id: number;
  image: string;
  event: number;
}

export interface AgendaItem {
  id: number;
  time_slot: string;
  action: string;
}

export interface GroupStatistic {
  group_name: string;
  count: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}