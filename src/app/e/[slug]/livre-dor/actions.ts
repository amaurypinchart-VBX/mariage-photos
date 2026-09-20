"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashPin, verifyPin } from "@/lib/guestbookAuth";
import type { GuestbookMedia, MediaKind, StickerPlacement } from "@/lib/types";

const GUESTBOOK_BUCKET = "guestbook-media";
const SIGNED_URL_TTL = 60 * 60 * 2; // 2h

type Admin = ReturnType<typeof createAdminClient>;
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type GuestbookPageData = {
  guestName: string;
  entry: { id: string; message: string; stickers: StickerPlacement[] };
  media: (GuestbookMedia & { url: string })[];
  albumPhotos: { id: string; url: string }[];
};

async function getActiveEvent(admin: Admin, slug: string) {
  const { data } = await admin
    .from("events")
    .select("id, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("guestbook_active", true)
    .maybeSingle();
  return data as { id: string; slug: string } | null;
}

export async function loginOrRegisterGuest(
  slug: string,
  name: string,
  pin: string
): Promise<ActionResult<{ guestId: string; isNew: boolean }>> {
  const trimmedName = name.trim();
  if (!trimmedName) return { ok: false, error: "Indique ton prénom." };
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "Le code doit contenir 4 chiffres." };

  const admin = createAdminClient();
  const event = await getActiveEvent(admin, slug);
  if (!event) return { ok: false, error: "Le livre d'or n'est pas disponible." };

  const nameKey = trimmedName.toLowerCase();
  const { data: existing } = await admin
    .from("guests")
    .select("id, pin_hash")
    .eq("event_id", event.id)
    .eq("name_key", nameKey)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; pin_hash: string };
    if (!verifyPin(pin, row.pin_hash)) {
      return { ok: false, error: "Code incorrect." };
    }
    return { ok: true, data: { guestId: row.id, isNew: false } };
  }

  const { data: created, error } = await admin
    .from("guests")
    .insert({ event_id: event.id, name: trimmedName, name_key: nameKey, pin_hash: hashPin(pin) })
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false, error: "Ce prénom est peut-être déjà pris avec un autre code." };
  }
  const guestId = (created as { id: string }).id;

  await admin.from("guestbook_entries").insert({ event_id: event.id, guest_id: guestId });

  return { ok: true, data: { guestId, isNew: true } };
}

export async function getMyGuestbookPage(
  slug: string,
  guestId: string,
  albumToken?: string | null
): Promise<ActionResult<GuestbookPageData>> {
  const admin = createAdminClient();
  const event = await getActiveEvent(admin, slug);
  if (!event) return { ok: false, error: "Le livre d'or n'est pas disponible." };

  const { data: guest } = await admin
    .from("guests")
    .select("id, name")
    .eq("id", guestId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!guest) return { ok: false, error: "invalid_guest" };

  let entryData: { id: string; message: string | null; stickers: unknown } | null = null;
  const { data: existingEntry } = await admin
    .from("guestbook_entries")
    .select("id, message, stickers")
    .eq("guest_id", guestId)
    .maybeSingle();
  entryData = existingEntry;

  if (!entryData) {
    const { data: created } = await admin
      .from("guestbook_entries")
      .insert({ event_id: event.id, guest_id: guestId })
      .select("id, message, stickers")
      .single();
    entryData = created;
  }
  if (!entryData) return { ok: false, error: "Erreur de chargement." };

  const { data: mediaRows } = await admin
    .from("guestbook_media")
    .select("id, entry_id, bucket, storage_path, kind, mime_type, size_bytes, created_at")
    .eq("entry_id", entryData.id)
    .order("created_at", { ascending: true });
  const media = (mediaRows ?? []) as GuestbookMedia[];

  const mediaWithUrls: (GuestbookMedia & { url: string })[] = [];
  const byBucket = new Map<string, GuestbookMedia[]>();
  media.forEach((m) => {
    const list = byBucket.get(m.bucket) ?? [];
    list.push(m);
    byBucket.set(m.bucket, list);
  });
  for (const [bucket, items] of byBucket) {
    const { data: signed } = await admin.storage
      .from(bucket)
      .createSignedUrls(
        items.map((m) => m.storage_path),
        SIGNED_URL_TTL
      );
    const urlByPath: Record<string, string> = {};
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && s.path) urlByPath[s.path] = s.signedUrl;
    });
    items.forEach((m) => {
      const url = urlByPath[m.storage_path];
      if (url) mediaWithUrls.push({ ...m, url });
    });
  }

  let albumPhotos: GuestbookPageData["albumPhotos"] = [];
  if (albumToken) {
    const { data: linkData } = await admin
      .from("share_links")
      .select("id")
      .eq("event_id", event.id)
      .eq("token", albumToken)
      .eq("is_active", true)
      .maybeSingle();
    const link = linkData as { id: string } | null;
    if (link) {
      const { data: uploadsData } = await admin
        .from("guest_uploads")
        .select("id, storage_path, kind")
        .eq("event_id", event.id)
        .eq("kind", "image")
        .or(`visible_to_all.eq.true,share_link_id.eq.${link.id}`)
        .order("created_at", { ascending: false });
      const uploads = (uploadsData ?? []) as { id: string; storage_path: string; kind: MediaKind }[];
      if (uploads.length > 0) {
        const { data: signed } = await admin.storage
          .from("wedding-media")
          .createSignedUrls(
            uploads.map((u) => u.storage_path),
            SIGNED_URL_TTL
          );
        const urlByPath: Record<string, string> = {};
        (signed ?? []).forEach((s) => {
          if (s.signedUrl && s.path) urlByPath[s.path] = s.signedUrl;
        });
        albumPhotos = uploads
          .filter((u) => urlByPath[u.storage_path])
          .map((u) => ({ id: u.id, url: urlByPath[u.storage_path] }));
      }
    }
  }

  return {
    ok: true,
    data: {
      guestName: (guest as { name: string }).name,
      entry: {
        id: entryData.id,
        message: entryData.message ?? "",
        stickers: ((entryData.stickers as StickerPlacement[]) ?? []),
      },
      media: mediaWithUrls,
      albumPhotos,
    },
  };
}

export async function saveGuestbookMessage(
  slug: string,
  guestId: string,
  message: string,
  stickers: StickerPlacement[]
): Promise<ActionResult<null>> {
  const admin = createAdminClient();
  const event = await getActiveEvent(admin, slug);
  if (!event) return { ok: false, error: "Le livre d'or n'est pas disponible." };

  const { data: guest } = await admin
    .from("guests")
    .select("id")
    .eq("id", guestId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!guest) return { ok: false, error: "invalid_guest" };

  const { error } = await admin
    .from("guestbook_entries")
    .update({ message, stickers, updated_at: new Date().toISOString() })
    .eq("guest_id", guestId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function addGuestbookMedia(
  slug: string,
  guestId: string,
  payload:
    | { storagePath: string; kind: "image" | "video" | "audio"; mimeType?: string | null; sizeBytes?: number | null }
    | { fromSharedUploadId: string }
): Promise<ActionResult<{ media: GuestbookMedia & { url: string } }>> {
  const admin = createAdminClient();
  const event = await getActiveEvent(admin, slug);
  if (!event) return { ok: false, error: "Le livre d'or n'est pas disponible." };

  const { data: entry } = await admin
    .from("guestbook_entries")
    .select("id")
    .eq("guest_id", guestId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!entry) return { ok: false, error: "invalid_guest" };

  let bucket: string;
  let storagePath: string;
  let kind: "image" | "video" | "audio";
  let mimeType: string | null = null;
  let sizeBytes: number | null = null;

  if ("fromSharedUploadId" in payload) {
    const { data: uploadData } = await admin
      .from("guest_uploads")
      .select("storage_path, kind, mime_type, size_bytes, visible_to_all, share_link_id")
      .eq("id", payload.fromSharedUploadId)
      .eq("event_id", event.id)
      .maybeSingle();
    const upload = uploadData as
      | {
          storage_path: string;
          kind: MediaKind;
          mime_type: string | null;
          size_bytes: number | null;
          visible_to_all: boolean;
          share_link_id: string | null;
        }
      | null;
    if (!upload || !(upload.visible_to_all || upload.share_link_id)) {
      return { ok: false, error: "Photo introuvable." };
    }
    bucket = "wedding-media";
    storagePath = upload.storage_path;
    kind = upload.kind;
    mimeType = upload.mime_type;
    sizeBytes = upload.size_bytes;
  } else {
    if (!payload.storagePath.startsWith(`${event.id}/`)) {
      return { ok: false, error: "Chemin invalide." };
    }
    bucket = GUESTBOOK_BUCKET;
    storagePath = payload.storagePath;
    kind = payload.kind;
    mimeType = payload.mimeType ?? null;
    sizeBytes = payload.sizeBytes ?? null;
  }

  const { data: created, error } = await admin
    .from("guestbook_media")
    .insert({
      entry_id: (entry as { id: string }).id,
      bucket,
      storage_path: storagePath,
      kind,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    })
    .select("id, entry_id, bucket, storage_path, kind, mime_type, size_bytes, created_at")
    .single();
  if (error || !created) return { ok: false, error: error?.message ?? "Erreur d'enregistrement." };

  const { data: signed } = await admin.storage.from(bucket).createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (!signed?.signedUrl) return { ok: false, error: "Erreur de signature du fichier." };

  return { ok: true, data: { media: { ...(created as GuestbookMedia), url: signed.signedUrl } } };
}

export async function removeGuestbookMedia(
  slug: string,
  guestId: string,
  mediaId: string
): Promise<ActionResult<null>> {
  const admin = createAdminClient();
  const event = await getActiveEvent(admin, slug);
  if (!event) return { ok: false, error: "Le livre d'or n'est pas disponible." };

  const { data: entry } = await admin
    .from("guestbook_entries")
    .select("id")
    .eq("guest_id", guestId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!entry) return { ok: false, error: "invalid_guest" };

  const { error } = await admin
    .from("guestbook_media")
    .delete()
    .eq("id", mediaId)
    .eq("entry_id", (entry as { id: string }).id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function castDestinationVote(
  slug: string,
  guestId: string,
  payload: { optionId: string } | { newLabel: string }
): Promise<ActionResult<{ optionId: string }>> {
  const admin = createAdminClient();
  const event = await getActiveEvent(admin, slug);
  if (!event) return { ok: false, error: "Le livre d'or n'est pas disponible." };

  const { data: guest } = await admin
    .from("guests")
    .select("id")
    .eq("id", guestId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!guest) return { ok: false, error: "invalid_guest" };

  let optionId: string;
  if ("newLabel" in payload) {
    const label = payload.newLabel.trim();
    if (!label) return { ok: false, error: "Indique une destination." };
    const labelKey = label.toLowerCase();
    const { data: existingOption } = await admin
      .from("destination_options")
      .select("id")
      .eq("event_id", event.id)
      .eq("label_key", labelKey)
      .maybeSingle();
    if (existingOption) {
      optionId = (existingOption as { id: string }).id;
    } else {
      const { data: created, error } = await admin
        .from("destination_options")
        .insert({ event_id: event.id, label, label_key: labelKey, created_by: guestId })
        .select("id")
        .single();
      if (error || !created) return { ok: false, error: "Erreur lors de l'ajout." };
      optionId = (created as { id: string }).id;
    }
  } else {
    optionId = payload.optionId;
  }

  const { error } = await admin
    .from("destination_votes")
    .upsert({ event_id: event.id, guest_id: guestId, option_id: optionId }, { onConflict: "event_id,guest_id" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { optionId } };
}
