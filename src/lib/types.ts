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
  guestbook_active: boolean;
  guestbook_cover_title: string | null;
  guestbook_cover_message: string | null;
  guestbook_cover_stickers: StickerPlacement[];
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

export type ShareLink = {
  id: string;
  event_id: string;
  label: string;
  token: string;
  is_active: boolean;
  created_at: string;
};

export type GuestUpload = {
  id: string;
  event_id: string;
  guest_name: string | null;
  storage_path: string;
  kind: MediaKind;
  mime_type: string | null;
  size_bytes: number | null;
  challenge_id: string | null;
  share_link_id: string | null;
  visible_to_all: boolean;
  created_at: string;
};

// ---------- Livre d'or ----------

export type Guest = {
  id: string;
  event_id: string;
  name: string;
  name_key: string;
  pin_hash: string;
  created_at: string;
};

export type StickerPlacement = {
  id: string;
  emoji: string;
  xPct: number; // 0-100, centre du sticker
  yPct: number; // 0-100
  scale: number; // 1 = taille de base
  rotationDeg: number;
};

export type GuestbookEntry = {
  id: string;
  event_id: string;
  guest_id: string;
  message: string | null;
  stickers: StickerPlacement[];
  created_at: string;
  updated_at: string;
};

export type GuestbookMediaKind = "image" | "video" | "audio";

export type GuestbookMedia = {
  id: string;
  entry_id: string;
  bucket: string;
  storage_path: string;
  kind: GuestbookMediaKind;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

// Photo de la page de couverture du livre d'or (le titre/message/stickers de
// la couverture vivent sur WeddingEvent.guestbook_cover_*).
export type GuestbookCoverPhoto = {
  id: string;
  event_id: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number;
  created_at: string;
};

// ---------- Vote destination lune de miel ----------

export type DestinationOption = {
  id: string;
  event_id: string;
  label: string;
  label_key: string;
  created_by: string | null;
  created_at: string;
};

export type DestinationVote = {
  id: string;
  event_id: string;
  option_id: string;
  guest_id: string;
  created_at: string;
};
