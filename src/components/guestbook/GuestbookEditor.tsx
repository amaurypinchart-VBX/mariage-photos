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
        Bonjour {initial.guestName} ✦ ta page est enregistrée automatiquement.
      </p>

      <div
        className="relative mt-4 overflow-hidden rounded-card border p-4"
        style={{
          borderColor: "var(--line)",
          minHeight: 260,
          background: "linear-gradient(160deg, var(--sage-tint), var(--champ-tint))",
        }}
      >
        <textarea
          value={message ?? ""}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Écris un petit mot pour les mariés…"
          className="relative h-full min-h-[220px] w-full resize-none bg-transparent outline-none"
          style={{ fontFamily: "var(--font-hand)", fontSize: "28px", lineHeight: 1.3, color: "var(--ink)" }}
        />
        <StickerCanvas stickers={stickers} onChange={setStickers} />
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
