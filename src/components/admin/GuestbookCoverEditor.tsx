"use client";

import imageCompression from "browser-image-compression";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import GuestbookCover from "@/components/guestbook/GuestbookCover";
import StickerCanvas from "@/components/guestbook/StickerCanvas";
import StickerPalette from "@/components/guestbook/StickerPalette";
import type { StickerPlacement } from "@/lib/types";

const BUCKET = "guestbook-media";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export type CoverPhoto = { id: string; url: string };
export type WeddingPhoto = { id: string; storagePath: string; url: string };

export default function GuestbookCoverEditor({
  eventId,
  coupleNames,
  initialTitle,
  initialMessage,
  initialStickers,
  initialPhotos,
  weddingPhotos,
}: {
  eventId: string;
  coupleNames: string;
  initialTitle: string | null;
  initialMessage: string | null;
  initialStickers: StickerPlacement[];
  initialPhotos: CoverPhoto[];
  weddingPhotos: WeddingPhoto[];
}) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [stickers, setStickers] = useState<StickerPlacement[]>(initialStickers);
  const [photos, setPhotos] = useState<CoverPhoto[]>(initialPhotos);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setSaving(true);
      const supabase = createClient();
      await supabase
        .from("events")
        .update({
          guestbook_cover_title: nextTitle || null,
          guestbook_cover_message: nextMessage || null,
          guestbook_cover_stickers: nextStickers,
        })
        .eq("id", eventId);
      setSaving(false);
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
    setError(null);
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
        setError(e instanceof Error ? e.message : "Erreur d'envoi.");
      }
    }
    setUploading(false);
  }

  async function pickFromWedding(photo: WeddingPhoto) {
    setError(null);
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
      setError(insErr?.message ?? "Erreur.");
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

  return (
    <div className="card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
            Titre de la couverture
          </label>
          <input
            value={title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Ex. Notre livre d'or"
            className="field-input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
            Petit mot d&apos;introduction
          </label>
          <input
            value={message}
            onChange={(e) => updateMessage(e.target.value)}
            placeholder="Ex. Laissez-nous un mot, une photo, un souvenir…"
            className="field-input"
          />
        </div>
      </div>

      <p className="mb-1.5 mt-4 text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
        Aperçu — c&apos;est exactement ce que verront tes invités. Dépose les stickers où tu veux.
      </p>
      <GuestbookCover
        coupleNames={coupleNames}
        title={title}
        message={message}
        stickers={stickers}
        photos={photos}
        stickerOverlay={<StickerCanvas stickers={stickers} onChange={updateStickers} />}
      />
      <StickerPalette onPick={addSticker} />

      <p className="mt-2 text-[12px]" style={{ color: "var(--ink-faint)" }}>
        {saving ? "Enregistrement…" : " "}
      </p>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
          Photos de couverture
        </label>
        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-4 gap-2">
            {photos.map((p) => (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-[10px] border"
                style={{ aspectRatio: "1", borderColor: "var(--line)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  className="absolute right-1 top-1 grid h-[20px] w-[20px] place-items-center rounded-full text-[11px] text-white"
                  style={{ background: "rgba(0,0,0,.55)" }}
                  aria-label="Retirer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="chip"
            style={{ cursor: "pointer" }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Envoi…" : "🖼️ Importer une photo"}
          </button>
          {weddingPhotos.length > 0 && (
            <button type="button" className="chip" style={{ cursor: "pointer" }} onClick={() => setPickerOpen(true)}>
              📷 Depuis la galerie du mariage
            </button>
          )}
        </div>
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
        {error && (
          <p className="mt-2 text-[13px]" style={{ color: "#c0522d" }}>
            {error}
          </p>
        )}
      </div>

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
