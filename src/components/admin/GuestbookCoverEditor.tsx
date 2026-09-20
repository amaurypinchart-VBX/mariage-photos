"use client";

import imageCompression from "browser-image-compression";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StickerCanvas from "@/components/guestbook/StickerCanvas";
import StickerPalette from "@/components/guestbook/StickerPalette";
import type { StickerPlacement } from "@/lib/types";

const BUCKET = "guestbook-media";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export type CoverPhoto = { id: string; url: string };

export default function GuestbookCoverEditor({
  eventId,
  initialTitle,
  initialMessage,
  initialStickers,
  initialPhotos,
}: {
  eventId: string;
  initialTitle: string | null;
  initialMessage: string | null;
  initialStickers: StickerPlacement[];
  initialPhotos: CoverPhoto[];
}) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [stickers, setStickers] = useState<StickerPlacement[]>(initialStickers);
  const [photos, setPhotos] = useState<CoverPhoto[]>(initialPhotos);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

      <div
        className="relative mt-4 overflow-hidden rounded-card border p-4"
        style={{
          borderColor: "var(--line)",
          minHeight: 140,
          background: "linear-gradient(160deg, var(--sage-tint), var(--champ-tint))",
        }}
      >
        <p className="text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
          Aperçu — dépose les stickers où tu veux
        </p>
        <StickerCanvas stickers={stickers} onChange={updateStickers} />
      </div>
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
        <button
          type="button"
          className="chip"
          style={{ cursor: "pointer" }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Envoi…" : "🖼️ Ajouter une photo"}
        </button>
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
    </div>
  );
}
