// Types partagés — reflètent le schéma défini dans supabase/schema.sql

export type EventTheme = {
  color_primary?: string | null; // sauge
  color_accent?: string | null; // champagne
};

export type WeddingEvent = {
  id: string;
  slug: string;
  couple_names: string; // ex. "Amaury & Cha"
  event_date: string | null; // ISO date
  place: string | null;
  welcome_message: string | null;
  color_primary: string | null;
  color_accent: string | null;
  game_active: boolean;
  gallery_public: boolean;
  is_active: boolean;
  created_at: string;
};

export type PhotoChallenge = {
  id: string;
  event_id: string;
  label: string;
  sort_order: number;
  unlock_threshold: number; // nb de défis "normaux" à réaliser avant déblocage (0 = direct)
  is_active: boolean;
};

export type MediaKind = "image" | "video";

export type GuestUpload = {
  id: string;
  event_id: string;
  guest_name: string | null;
  storage_path: string;
  kind: MediaKind;
  mime_type: string | null;
  size_bytes: number | null;
  challenge_id: string | null;
  created_at: string;
};
