"use client";

import imageCompression from "browser-image-compression";
import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGuestName } from "@/lib/useGuestName";

const BUCKET = "wedding-media";

type Status = "ready" | "working" | "done" | "error";
type Item = {
  id: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
  status: Status;
  message?: string;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
}

export default function Uploader({
  eventId,
  slug,
  challengeId = null,
  onAllDone,
}: {
  eventId: string;
  slug: string;
  challengeId?: string | null;
  onAllDone?: () => void;
}) {
  const { name } = useGuestName(slug);
  const [items, setItems] = useState<Item[]>([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const next: Item[] = Array.from(files).map((file) => ({
      id: uid(),
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video"),
      status: "ready" as Status,
    }));
    setItems((prev) => [...prev, ...next]);
  }, []);

  const setItem = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  async function uploadOne(supabase: ReturnType<typeof createClient>, it: Item) {
    setItem(it.id, { status: "working", message: "Préparation…" });
    try {
      let blob: Blob = it.file;
      let contentType = it.file.type || "application/octet-stream";

      // Compression uniquement pour les images (les vidéos sont envoyées telles quelles).
      if (!it.isVideo && it.file.type.startsWith("image/") && it.file.type !== "image/gif") {
        setItem(it.id, { message: "Optimisation…" });
        try {
          blob = await imageCompression(it.file, {
            maxSizeMB: 3,
            maxWidthOrHeight: 2560,
            useWebWorker: true,
          });
          contentType = "image/jpeg";
        } catch {
          blob = it.file; // en cas d'échec, on envoie l'original
        }
      }

      setItem(it.id, { message: "Envoi…" });
      const ext = it.isVideo ? safeName(it.file.name) : "photo.jpg";
      const path = `${eventId}/${uid()}-${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType, upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;

      // La confirmation n'a lieu qu'APRÈS l'enregistrement réel côté serveur.
      const { error: dbErr } = await supabase.from("guest_uploads").insert({
        event_id: eventId,
        guest_name: name || null,
        storage_path: path,
        kind: it.isVideo ? "video" : "image",
        mime_type: contentType,
        size_bytes: blob.size,
        challenge_id: challengeId,
      });
      if (dbErr) throw dbErr;

      setItem(it.id, { status: "done", message: undefined });
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      setItem(it.id, { status: "error", message: msg });
      return false;
    }
  }

  async function sendAll() {
    const supabase = createClient();
    setSending(true);
    const pending = items.filter((it) => it.status !== "done");
    let ok = 0;
    for (const it of pending) {
      const success = await uploadOne(supabase, it);
      if (success) ok += 1;
    }
    setSending(false);
    if (ok > 0) {
      setToast(`${ok} souvenir${ok > 1 ? "s" : ""} bien reçu${ok > 1 ? "s" : ""} !`);
      setTimeout(() => setToast(null), 3200);
      onAllDone?.();
    }
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  const allDone = items.length > 0 && doneCount === items.length;
  const hasPending = items.some((i) => i.status !== "done");

  return (
    <div className="flex flex-1 flex-col">
      <label
        htmlFor="filepick"
        className="mt-[18px] cursor-pointer rounded-card border p-[30px] text-center transition"
        style={{
          borderStyle: "dashed",
          borderWidth: "1.5px",
          borderColor: "var(--line-strong)",
          background: "var(--surface-2)",
        }}
      >
        <div
          className="mx-auto mb-3 grid h-[52px] w-[52px] place-items-center rounded-full text-[24px]"
          style={{ background: "var(--sage-tint)", color: "var(--sage)" }}
        >
          ＋
        </div>
        <div className="text-[15.5px] font-semibold">Ajouter des photos</div>
        <div className="mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
          Prends une photo ou choisis dans ta galerie
        </div>
        <div className="mt-[15px] flex justify-center gap-[9px]">
          <span className="chip">📷 Appareil photo</span>
          <span className="chip">🖼️ Galerie</span>
        </div>
      </label>
      <input
        id="filepick"
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="sr-only absolute h-px w-px overflow-hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {items.length > 0 && (
        <div className="mt-[18px] grid grid-cols-3 gap-[9px]">
          {items.map((it) => (
            <div
              key={it.id}
              className="relative overflow-hidden rounded-[12px] border"
              style={{ aspectRatio: "1", borderColor: "var(--line)", background: "var(--surface-2)" }}
            >
              {it.isVideo ? (
                <video src={it.previewUrl} className="h-full w-full object-cover" muted playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
              )}

              {it.status === "working" && (
                <div
                  className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-1.5"
                  style={{
                    height: "100%",
                    background: "linear-gradient(to top, rgba(15,18,14,.6), transparent 55%)",
                  }}
                >
                  <span className="mb-1 text-[10px] font-semibold text-white/90">{it.message}</span>
                  <span className="mx-1.5 mb-1.5 h-1 w-[calc(100%-12px)] overflow-hidden rounded-full bg-white/30">
                    <span className="indeterminate block h-full w-1/2 rounded-full" style={{ background: "var(--champ)", animation: "eclatsbar 1.1s ease-in-out infinite" }} />
                  </span>
                </div>
              )}

              {it.status === "done" && (
                <span
                  className="absolute right-1.5 top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full text-[12px]"
                  style={{ background: "var(--sage)", color: "var(--on-accent)" }}
                >
                  ✓
                </span>
              )}

              {it.status === "error" && (
                <button
                  onClick={() => {
                    const supabase = createClient();
                    uploadOne(supabase, it);
                  }}
                  className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white"
                  style={{ background: "rgba(160,60,40,.72)" }}
                  title={it.message}
                >
                  ↻ Réessayer
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-[18px]">
        <div className="mb-2.5 text-center text-[13px]" style={{ color: "var(--ink-soft)" }}>
          {items.length === 0 ? (
            "Aucune photo sélectionnée"
          ) : allDone ? (
            <span style={{ color: "var(--ink)" }}>
              <b>{doneCount}</b> photo{doneCount > 1 ? "s" : ""} envoyée{doneCount > 1 ? "s" : ""} — merci !
            </span>
          ) : (
            <span>
              <b style={{ color: "var(--ink)" }}>{items.length}</b> photo{items.length > 1 ? "s" : ""} prête
              {items.length > 1 ? "s" : ""} à envoyer
            </span>
          )}
        </div>

        {!allDone ? (
          <button
            className="btn btn-primary w-full"
            disabled={sending || !hasPending}
            style={sending || !hasPending ? { opacity: 0.5 } : undefined}
            onClick={sendAll}
          >
            {sending ? "Envoi en cours…" : <><span className="text-[18px]">↑</span> Envoyer</>}
          </button>
        ) : (
          <button className="btn btn-ghost w-full" onClick={() => inputRef.current?.click()}>
            ＋ Ajouter d&apos;autres photos
          </button>
        )}
      </div>

      {toast && (
        <div
          className="fixed inset-x-4 bottom-5 z-20 mx-auto flex max-w-app items-center gap-2.5 rounded-[14px] px-4 py-3.5 text-sm font-semibold shadow-lift"
          style={{ background: "var(--ink)", color: "var(--bg)" }}
        >
          <span
            className="grid h-[22px] w-[22px] place-items-center rounded-full text-[12px]"
            style={{ background: "var(--sage)", color: "var(--on-accent)" }}
          >
            ✓
          </span>
          {toast}
        </div>
      )}

      <style>{`@keyframes eclatsbar{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
    </div>
  );
}
