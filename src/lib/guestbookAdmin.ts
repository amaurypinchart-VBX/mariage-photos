import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type {
  DestinationOption,
  DestinationVote,
  Guest,
  GuestbookCoverPhoto,
  GuestbookEntry,
  GuestbookMedia,
  StickerPlacement,
  WeddingEvent,
} from "@/lib/types";

type ServerSupabase = ReturnType<typeof createClient>;

export type GuestbookCoverData = {
  title: string | null;
  message: string | null;
  stickers: StickerPlacement[];
  photos: { id: string; url: string }[];
};

export type GuestPage = {
  guest: Guest;
  entry: GuestbookEntry;
  media: (GuestbookMedia & { url: string })[];
};

export type DestinationTally = { option: DestinationOption; count: number };

const SIGNED_URL_TTL = 60 * 60 * 2;

// Récupère, pour un mariage, la page de chaque invité (invités sans page —
// cas normalement impossible puisqu'une entrée vide est créée à l'inscription,
// mais on s'en prémunit quand même) avec ses médias déjà signés.
export async function getGuestbookPages(supabase: ServerSupabase, eventId: string): Promise<GuestPage[]> {
  const [{ data: guestsData }, { data: entriesData }] = await Promise.all([
    supabase
      .from("guests")
      .select("id, event_id, name, name_key, pin_hash, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
    supabase
      .from("guestbook_entries")
      .select("id, event_id, guest_id, message, stickers, created_at, updated_at")
      .eq("event_id", eventId),
  ]);

  const guests = (guestsData as Guest[]) ?? [];
  const entries = (entriesData as GuestbookEntry[]) ?? [];

  let media: GuestbookMedia[] = [];
  if (entries.length > 0) {
    const { data: mediaData } = await supabase
      .from("guestbook_media")
      .select("id, entry_id, bucket, storage_path, kind, mime_type, size_bytes, created_at")
      .in(
        "entry_id",
        entries.map((e) => e.id)
      );
    media = (mediaData as GuestbookMedia[]) ?? [];
  }

  const urlByKey: Record<string, string> = {};
  if (media.length > 0) {
    const byBucket = new Map<string, GuestbookMedia[]>();
    media.forEach((m) => {
      const list = byBucket.get(m.bucket) ?? [];
      list.push(m);
      byBucket.set(m.bucket, list);
    });
    for (const [bucket, items] of byBucket) {
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrls(
          items.map((m) => m.storage_path),
          SIGNED_URL_TTL
        );
      (signed ?? []).forEach((s) => {
        if (s.signedUrl && s.path) urlByKey[`${bucket}:${s.path}`] = s.signedUrl;
      });
    }
  }

  const entryByGuestId = new Map(entries.map((e) => [e.guest_id, e]));
  const mediaByEntryId = new Map<string, (GuestbookMedia & { url: string })[]>();
  media.forEach((m) => {
    const url = urlByKey[`${m.bucket}:${m.storage_path}`];
    if (!url) return;
    const list = mediaByEntryId.get(m.entry_id) ?? [];
    list.push({ ...m, url });
    mediaByEntryId.set(m.entry_id, list);
  });

  return guests.map((guest) => {
    const entry = entryByGuestId.get(guest.id) ?? {
      id: `blank-${guest.id}`,
      event_id: eventId,
      guest_id: guest.id,
      message: "",
      stickers: [],
      created_at: guest.created_at,
      updated_at: guest.created_at,
    };
    return { guest, entry, media: mediaByEntryId.get(entry.id) ?? [] };
  });
}

// Récupère la page de couverture du livre d'or (titre/message/stickers vivent
// sur `events`, les photos dans leur propre table) avec ses URLs signées.
export async function getGuestbookCover(supabase: ServerSupabase, event: WeddingEvent): Promise<GuestbookCoverData> {
  const { data: photosData } = await supabase
    .from("guestbook_cover_photos")
    .select("id, event_id, storage_path, mime_type, size_bytes, sort_order, created_at")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });
  const photoRows = (photosData as GuestbookCoverPhoto[]) ?? [];

  let photos: { id: string; url: string }[] = [];
  if (photoRows.length > 0) {
    const { data: signed } = await supabase.storage
      .from("guestbook-media")
      .createSignedUrls(
        photoRows.map((p) => p.storage_path),
        SIGNED_URL_TTL
      );
    const urlByPath: Record<string, string> = {};
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && s.path) urlByPath[s.path] = s.signedUrl;
    });
    photos = photoRows.filter((p) => urlByPath[p.storage_path]).map((p) => ({ id: p.id, url: urlByPath[p.storage_path] }));
  }

  return {
    title: event.guestbook_cover_title,
    message: event.guestbook_cover_message,
    stickers: event.guestbook_cover_stickers ?? [],
    photos,
  };
}

export async function getDestinationTallies(supabase: ServerSupabase, eventId: string): Promise<DestinationTally[]> {
  const [{ data: optionsData }, { data: votesData }] = await Promise.all([
    supabase.from("destination_options").select("id, event_id, label, label_key, created_by, created_at").eq("event_id", eventId),
    supabase.from("destination_votes").select("id, event_id, option_id, guest_id, created_at").eq("event_id", eventId),
  ]);
  const options = (optionsData as DestinationOption[]) ?? [];
  const votes = (votesData as DestinationVote[]) ?? [];
  return options.map((option) => ({ option, count: votes.filter((v) => v.option_id === option.id).length }));
}
