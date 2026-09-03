import { createClient } from "@/lib/supabase/server";
import type { PhotoChallenge, WeddingEvent } from "@/lib/types";

// Récupère un événement (mariage) par son slug, s'il est actif.
export async function getEventBySlug(
  slug: string
): Promise<WeddingEvent | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, couple_names, event_date, place, welcome_message, color_primary, color_accent, game_active, gallery_public, is_active, created_at"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as WeddingEvent;
}

// Récupère les défis actifs d'un événement, dans l'ordre.
export async function getChallenges(
  eventId: string
): Promise<PhotoChallenge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("photo_challenges")
    .select("id, event_id, label, sort_order, unlock_threshold, is_active")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as PhotoChallenge[];
}
