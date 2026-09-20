"use client";

import imageCompression from "browser-image-compression";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addGuestbookMedia, removeGuestbookMedia } from "@/app/e/[slug]/livre-dor/actions";
import MediaRecorderButton from "./MediaRecorderButton";
import type { GuestbookMedia } from "@/lib/types";

const BUCKET = "guestbook-media";

type MediaItem = GuestbookMedia & { url: string };

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
}

export default function MediaAttachments({
  eventId,
  slug,
  guestId,
  media,
  onMediaChange,
  albumPhotos,
}: {
  eventId: string;
  slug: string;
  guestId: string;
  media: MediaItem[];
  onMediaChange: (next: MediaItem[]) => void;
  albumPhotos: { id: string; url: string }[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  async function uploadBlob(blob: Blob, kind: "image" | "video" | "audio", filename: string, mimeType: string) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const path = `${eventId}/${guestId}/${uid()}-${filename}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: mimeType,
        upsert: false,
        cacheControl: "3600",
      });
      if (upErr) throw upErr;

      const result = await addGuestbookMedia(slug, guestId, {
        storagePath: path,
        kind,
        mimeType,
        sizeBytes: blob.size,
      });
      if (!result.ok) throw new Error(result.error);
      onMediaChange([...media, result.data.media]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'envoi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      let blob: Blob = file;
      let mimeType = file.type || "application/octet-stream";
      if (!isVideo && file.type.startsWith("image/") && file.type !== "image/gif") {
        try {
          blob = await imageCompression(file, { maxSizeMB: 3, maxWidthOrHeight: 2560, useWebWorker: true });
          mimeType = "image/jpeg";
        } catch {
          blob = file;
        }
      }
      await uploadBlob(blob, isVideo ? "video" : "image", isVideo ? safeName(file.name) : "photo.jpg", mimeType);
    }
  }

  async function pickFromAlbum(uploadId: string) {
    setBusy(true);
    setError(null);
    const result = await addGuestbookMedia(slug, guestId, { fromSharedUploadId: uploadId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onMediaChange([...media, result.data.media]);
    setPickerOpen(false);
  }

  async function remove(mediaId: string) {
    onMediaChange(media.filter((m) => m.id !== mediaId));
    await removeGuestbookMedia(slug, guestId, mediaId);
  }

  return (
    <div className="mt-5">
      <h3 className="text-[14px] font-semibold">Photos, vidéo, message vocal</h3>

      {media.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {media.map((m) => (
            <div
              key={m.id}
              className="relative overflow-hidden rounded-[12px] border"
              style={{ aspectRatio: "1", borderColor: "var(--line)", background: "var(--surface-2)" }}
            >
              {m.kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
              {m.kind === "video" && <video src={m.url} controls playsInline className="h-full w-full object-cover" />}
              {m.kind === "audio" && (
                <div className="flex h-full items-center justify-center p-2">
                  <audio src={m.url} controls className="w-full" />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(m.id)}
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

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="chip" style={{ cursor: "pointer" }} onClick={() => cameraInputRef.current?.click()} disabled={busy}>
          📷 Prendre une photo
        </button>
        <button type="button" className="chip" style={{ cursor: "pointer" }} onClick={() => libraryInputRef.current?.click()} disabled={busy}>
          🖼️ Depuis mon téléphone
        </button>
        <MediaRecorderButton kind="audio" label="🎙️ Message vocal" onRecorded={(blob, mime) => uploadBlob(blob, "audio", "voix.webm", mime)} />
        <MediaRecorderButton kind="video" label="🎥 Vidéo" onRecorded={(blob, mime) => uploadBlob(blob, "video", "video.webm", mime)} />
        {albumPhotos.length > 0 && (
          <button type="button" className="chip" style={{ cursor: "pointer" }} onClick={() => setPickerOpen(true)}>
            💐 Depuis la galerie partagée
          </button>
        )}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only absolute h-px w-px overflow-hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*,video/*"
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
            <h4 className="mb-3 text-[15px] font-semibold">Choisir dans la galerie partagée</h4>
            <div className="grid grid-cols-3 gap-2">
              {albumPhotos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickFromAlbum(p.id)}
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
