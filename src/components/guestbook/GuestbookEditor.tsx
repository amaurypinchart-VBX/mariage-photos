"use client";

import { useEffect, useRef, useState } from "react";
import { saveGuestbookMessage } from "@/app/e/[slug]/livre-dor/actions";
import type { GuestbookPageData } from "@/app/e/[slug]/livre-dor/actions";
import StickerCanvas from "./StickerCanvas";
import StickerPalette from "./StickerPalette";
import MediaAttachments from "./MediaAttachments";
import DestinationPoll from "./DestinationPoll";
import type { GuestbookMedia, StickerPlacement } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function GuestbookEditor({
  slug,
  eventId,
  guestId,
  initial,
}: {
  slug: string;
  eventId: string;
  guestId: string;
  initial: GuestbookPageData;
}) {
  const [message, setMessage] = useState(initial.entry.message);
  const [stickers, setStickers] = useState<StickerPlacement[]>(initial.entry.stickers);
  const [media, setMedia] = useState<(GuestbookMedia & { url: string })[]>(initial.media);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await saveGuestbookMessage(slug, guestId, message, stickers);
      setSaving(false);
      setSavedOnce(true);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, stickers]);

  function addSticker(emoji: string) {
    const next: StickerPlacement = { id: uid(), emoji, xPct: 50, yPct: 45, scale: 1, rotationDeg: 0 };
    setStickers((prev) => [...prev, next]);
  }

  return (
    <div>
      <p className="mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
        Ta page est enregistrée automatiquement pendant que tu écris.
      </p>

      {/* Reliure : la page de l'invité, comme dans un vrai livre */}
      <div
        className="mt-4 rounded-[22px] p-2.5"
        style={{
          background: "linear-gradient(155deg, var(--sage-strong), var(--sage))",
          boxShadow: "0 18px 40px -18px rgba(20,28,20,.45), 0 2px 0 rgba(255,255,255,.08) inset",
        }}
      >
        <div
          className="relative overflow-hidden rounded-[14px] p-5"
          style={{
            background: "repeating-linear-gradient(#fdfaf1, #fdfaf1 33px, rgba(79,97,82,.08) 34px)",
            minHeight: 300,
          }}
        >
          {/* Ombre de reliure côté gauche */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-6"
            style={{ background: "linear-gradient(90deg, rgba(0,0,0,.12), rgba(0,0,0,0))" }}
          />
          <div className="eyebrow" style={{ color: "var(--sage)" }}>
            {initial.guestName}
          </div>
          <textarea
            value={message ?? ""}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Écris un petit mot pour les mariés…"
            className="relative mt-2 h-full min-h-[220px] w-full resize-none bg-transparent outline-none"
            style={{ fontFamily: "var(--font-hand)", fontSize: "28px", lineHeight: 1.3, color: "var(--ink)" }}
          />
          <StickerCanvas stickers={stickers} onChange={setStickers} />
        </div>
      </div>

      <StickerPalette onPick={addSticker} />

      <p className="mt-2 text-[12px]" style={{ color: "var(--ink-faint)" }}>
        {saving ? "Enregistrement…" : savedOnce ? "Enregistré ✓" : ""}
      </p>

      <MediaAttachments
        eventId={eventId}
        slug={slug}
        guestId={guestId}
        media={media}
        onMediaChange={setMedia}
        albumPhotos={initial.albumPhotos}
      />

      <DestinationPoll eventId={eventId} slug={slug} guestId={guestId} />
    </div>
  );
}
