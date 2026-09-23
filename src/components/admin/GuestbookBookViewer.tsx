"use client";

import imageCompression from "browser-image-compression";
import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GuestPage, GuestbookCoverData } from "@/lib/guestbookAdmin";
import GuestbookBookShell, { type BookSpread } from "@/components/guestbook/GuestbookBookShell";
import StaticStickers from "@/components/guestbook/StaticStickers";
import StickerCanvas from "@/components/guestbook/StickerCanvas";
import StickerPalette from "@/components/guestbook/StickerPalette";
import type { StickerPlacement } from "@/lib/types";

const BUCKET = "guestbook-media";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export type CoverPhoto = { id: string; url: string };
export type WeddingPhoto = { id: string; storagePath: string; url: string };

// Le livre d'or admin — un seul objet "livre" qu'on feuillette et qu'on édite
// directement sur la page (couverture) comme si on le tenait en main, au lieu
// d'un formulaire séparé au-dessus d'un aperçu en lecture seule.
export default function GuestbookBookViewer({
  eventId,
  coupleNames,
  cover,
  pages,
  weddingPhotos,
}: {
  eventId: string;
  coupleNames: string;
  cover: GuestbookCoverData;
  pages: GuestPage[];
  weddingPhotos: WeddingPhoto[];
}) {
  // ---- Couverture : édition directe (titre, mot, stickers, photos) ----
  const [title, setTitle] = useState(cover.title ?? "");
  const [message, setMessage] = useState(cover.message ?? "");
  const [stickers, setStickers] = useState<StickerPlacement[]>(cover.stickers);
  const [photos, setPhotos] = useState<CoverPhoto[]>(cover.photos);
  const [savingCover, setSavingCover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirstSave = useRef(true);

  function scheduleSave(nextTitle: string, nextMessage: string, nextStickers: StickerPlacement[]) {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSavingCover(true);
      const supabase = createClient();
      await supabase
        .from("events")
        .update({
          guestbook_cover_title: nextTitle || null,
          guestbook_cover_message: nextMessage || null,
          guestbook_cover_stickers: nextStickers,
        })
        .eq("id", eventId);
      setSavingCover(false);
    }, 800);
  }

  function updateTitle(v: string) {
    setTitle(v);
    scheduleSave(v, message, stickers);
  }
  function updateMessage(v: string) {
    setMessage(v);
    scheduleSave(title, v, stickers);
  }
  function updateStickers(next: StickerPlacement[]) {
    setStickers(next);
    scheduleSave(title, message, next);
  }
  function addSticker(emoji: string) {
    updateStickers([...stickers, { id: uid(), emoji, xPct: 50, yPct: 50, scale: 1, rotationDeg: 0 }]);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setPhotoError(null);
    const supabase = createClient();
    for (const file of Array.from(files)) {
      try {
        let blob: Blob = file;
        let mimeType = file.type || "image/jpeg";
        if (file.type !== "image/gif") {
          try {
            blob = await imageCompression(file, { maxSizeMB: 3, maxWidthOrHeight: 2560, useWebWorker: true });
            mimeType = "image/jpeg";
          } catch {
            blob = file;
          }
        }
        const path = `${eventId}/cover/${uid()}.jpg`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType: mimeType,
          upsert: false,
          cacheControl: "3600",
        });
        if (upErr) throw upErr;

        const { data: created, error: insErr } = await supabase
          .from("guestbook_cover_photos")
          .insert({
            event_id: eventId,
            bucket: BUCKET,
            storage_path: path,
            mime_type: mimeType,
            size_bytes: blob.size,
            sort_order: photos.length,
          })
          .select("id")
          .single();
        if (insErr || !created) throw insErr;

        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 2);
        if (signed?.signedUrl) {
          setPhotos((prev) => [...prev, { id: (created as { id: string }).id, url: signed.signedUrl }]);
        }
      } catch (e) {
        setPhotoError(e instanceof Error ? e.message : "Erreur d'envoi.");
      }
    }
    setUploading(false);
  }

  async function pickFromWedding(photo: WeddingPhoto) {
    setPhotoError(null);
    const supabase = createClient();
    const { data: created, error: insErr } = await supabase
      .from("guestbook_cover_photos")
      .insert({
        event_id: eventId,
        bucket: "wedding-media",
        storage_path: photo.storagePath,
        sort_order: photos.length,
      })
      .select("id")
      .single();
    if (insErr || !created) {
      setPhotoError(insErr?.message ?? "Erreur.");
      return;
    }
    setPhotos((prev) => [...prev, { id: (created as { id: string }).id, url: photo.url }]);
    setPickerOpen(false);
  }

  async function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    const supabase = createClient();
    await supabase.from("guestbook_cover_photos").delete().eq("id", id);
  }

  // ---- Pages des invités : lecture + suppression ----
  const [localPages, setLocalPages] = useState(pages);
  const [deleting, setDeleting] = useState<string | null>(null);
  const sorted = useMemo(
    () => [...localPages].sort((a, b) => a.guest.name.localeCompare(b.guest.name, "fr")),
    [localPages]
  );

  async function removeGuest(guestId: string) {
    if (!confirm("Supprimer définitivement cette page (et ses médias) ?")) return;
    setDeleting(guestId);
    const supabase = createClient();
    const { error } = await supabase.from("guests").delete().eq("id", guestId);
    setDeleting(null);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setLocalPages((prev) => prev.filter((p) => p.guest.id !== guestId));
  }

  const [pageIndex, setPageIndex] = useState(0);

  const coverSpread: BookSpread = {
    key: "cover",
    left: (
      <div className="relative h-full">
        <div className="eyebrow" style={{ color: "var(--sage)" }}>
          Couverture
        </div>
        <input
          value={title}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder={coupleNames}
          className="display relative mt-1 w-full bg-transparent text-[22px] outline-none"
          style={{ border: "none", color: "var(--ink)" }}
        />
        <textarea
          value={message}
          onChange={(e) => updateMessage(e.target.value)}
          placeholder="Petit mot d'introduction pour vos invités…"
          className="relative mt-3 w-full resize-none bg-transparent outline-none"
          style={{ fontFamily: "var(--font-hand)", fontSize: "24px", lineHeight: 1.3, color: "var(--ink)", minHeight: 110 }}
        />
        <StickerCanvas stickers={stickers} onChange={updateStickers} />
      </div>
    ),
    right: (
      <div>
        <div className="eyebrow" style={{ color: "var(--champ)" }}>
          En photos
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative overflow-hidden rounded-[10px] border shadow-soft"
              style={{ aspectRatio: "1", borderColor: "rgba(79,97,82,.18)", background: "var(--surface-2)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                className="absolute right-1 top-1 grid h-[20px] w-[20px] place-items-center rounded-full text-[11px] text-white"
                style={{ background: "rgba(0,0,0,.55)", cursor: "pointer" }}
                aria-label="Retirer"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="grid place-items-center rounded-[10px] border border-dashed text-[22px]"
            style={{ aspectRatio: "1", borderColor: "var(--line-strong)", color: "var(--ink-faint)", cursor: "pointer" }}
            aria-label="Ajouter une photo de couverture"
          >
            {uploading ? "…" : "+"}
          </button>
        </div>
        {weddingPhotos.length > 0 && (
          <button
            type="button"
            className="chip mt-3"
            style={{ cursor: "pointer" }}
            onClick={() => setPickerOpen(true)}
          >
            📷 Depuis la galerie du mariage
          </button>
        )}
        {photoError && (
          <p className="mt-2 text-[12.5px]" style={{ color: "#c0522d" }}>
            {photoError}
          </p>
        )}
      </div>
    ),
  };

  const guestSpreads: BookSpread[] = sorted.map((p) => ({
    key: p.guest.id,
    left: (
      <>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="eyebrow" style={{ color: "var(--sage)" }}>
              {formatDate(p.entry.updated_at)}
            </div>
            <div className="display mt-1 text-[22px]">{p.guest.name}</div>
          </div>
          <button
            type="button"
            onClick={() => removeGuest(p.guest.id)}
            disabled={deleting === p.guest.id}
            className="flex-none text-[12px] font-semibold"
            style={{ color: "#c0522d", cursor: "pointer" }}
          >
            {deleting === p.guest.id ? "…" : "Supprimer"}
          </button>
        </div>

        <div className="relative mt-4" style={{ minHeight: 160 }}>
          {p.entry.message ? (
            <p
              className="whitespace-pre-wrap"
              style={{ fontFamily: "var(--font-hand)", fontSize: "27px", lineHeight: 1.3, color: "var(--ink)" }}
            >
              {p.entry.message}
            </p>
          ) : (
            <p className="italic" style={{ fontFamily: "var(--font-hand)", fontSize: "22px", color: "var(--ink-faint)" }}>
              Cette page n&apos;a pas encore été écrite…
            </p>
          )}
          <StaticStickers stickers={p.entry.stickers} />
        </div>
      </>
    ),
    right: (
      <div>
        <div className="eyebrow" style={{ color: "var(--champ)" }}>
          Souvenirs joints
        </div>
        {p.media.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {p.media.map((m) => (
              <div
                key={m.id}
                className="overflow-hidden rounded-[10px] border shadow-soft"
                style={{ aspectRatio: "1", borderColor: "rgba(79,97,82,.18)", background: "var(--surface-2)" }}
              >
                {m.kind === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
                {m.kind === "video" && <video src={m.url} controls playsInline className="h-full w-full object-cover" />}
                {m.kind === "audio" && (
                  <div className="flex h-full items-center justify-center p-1">
                    <audio src={m.url} controls className="w-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[13.5px] italic" style={{ color: "var(--ink-faint)" }}>
            Aucune photo, vidéo ou message vocal joint.
          </p>
        )}
      </div>
    ),
  }));

  const spreads: BookSpread[] = [coverSpread, ...guestSpreads];

  return (
    <div>
      <GuestbookBookShell
        coverTitle={title || coupleNames}
        coverEyebrow="Livre d'or"
        spreads={spreads}
        startOpen
        showCloseButton
        index={pageIndex}
        onIndexChange={setPageIndex}
      />

      {pageIndex === 0 && (
        <>
          <StickerPalette onPick={addSticker} />
          <p className="mt-2 text-[12px]" style={{ color: "var(--ink-faint)" }}>
            {savingCover ? "Enregistrement…" : "Titre, mot, stickers et photos se modifient directement sur la page."}
          </p>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only absolute h-px w-px overflow-hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {pickerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,.6)" }}
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="max-h-[70vh] w-full max-w-app overflow-y-auto rounded-t-[20px] p-4"
            style={{ background: "var(--bg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="mb-3 text-[15px] font-semibold">Choisir dans la galerie du mariage</h4>
            <div className="grid grid-cols-3 gap-2">
              {weddingPhotos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickFromWedding(p)}
                  className="overflow-hidden rounded-[10px] border"
                  style={{ aspectRatio: "1", borderColor: "var(--line)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
