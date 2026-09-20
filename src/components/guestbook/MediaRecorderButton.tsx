"use client";

import { useRef, useState } from "react";

function pickSupportedMime(candidates: string[]): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return null;
}

export default function MediaRecorderButton({
  kind,
  label,
  onRecorded,
}: {
  kind: "audio" | "video";
  label: string;
  onRecorded: (blob: Blob, mimeType: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const blobRef = useRef<{ blob: Blob; mimeType: string } | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "video" ? { video: { facingMode: "user" }, audio: true } : { audio: true }
      );
      streamRef.current = stream;
      if (kind === "video" && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        await videoPreviewRef.current.play().catch(() => {});
      }
      const mimeType =
        kind === "video"
          ? pickSupportedMime(["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"])
          : pickSupportedMime(["audio/webm", "audio/mp4", "audio/ogg"]);
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalType = mimeType || (kind === "video" ? "video/webm" : "audio/webm");
        const blob = new Blob(chunksRef.current, { type: finalType });
        blobRef.current = { blob, mimeType: finalType };
        setPreviewUrl(URL.createObjectURL(blob));
        stopStream();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Impossible d'accéder au micro/à la caméra.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    stopTimer();
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setSeconds(0);
  }

  function close() {
    if (recording) stopRecording();
    stopStream();
    stopTimer();
    reset();
    setOpen(false);
    setError(null);
  }

  function send() {
    if (!blobRef.current) return;
    onRecorded(blobRef.current.blob, blobRef.current.mimeType);
    close();
  }

  if (!open) {
    return (
      <button type="button" className="chip" style={{ cursor: "pointer" }} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <div className="card mt-3 w-full p-4">
      {error && (
        <p className="mb-2 text-[13px]" style={{ color: "#c0522d" }}>
          {error}
        </p>
      )}

      {kind === "video" && (
        <video
          ref={videoPreviewRef}
          className="mb-3 w-full rounded-[12px]"
          style={{ background: "#000", aspectRatio: "1", objectFit: "cover", display: previewUrl ? "none" : "block" }}
          playsInline
        />
      )}
      {previewUrl && kind === "video" && (
        <video src={previewUrl} controls playsInline className="mb-3 w-full rounded-[12px]" style={{ aspectRatio: "1", objectFit: "cover" }} />
      )}
      {previewUrl && kind === "audio" && <audio src={previewUrl} controls className="mb-3 w-full" />}

      <div className="flex items-center justify-center gap-3">
        {!recording && !previewUrl && (
          <button type="button" className="btn btn-primary" onClick={startRecording}>
            ● Démarrer l&apos;enregistrement
          </button>
        )}
        {recording && (
          <button type="button" className="btn btn-primary" onClick={stopRecording}>
            ■ Arrêter ({seconds}s)
          </button>
        )}
        {previewUrl && (
          <>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              ↻ Recommencer
            </button>
            <button type="button" className="btn btn-primary" onClick={send}>
              ✓ Envoyer
            </button>
          </>
        )}
      </div>
      <button type="button" className="mt-3 w-full text-center text-[13px]" style={{ color: "var(--ink-soft)", cursor: "pointer" }} onClick={close}>
        Annuler
      </button>
    </div>
  );
}
