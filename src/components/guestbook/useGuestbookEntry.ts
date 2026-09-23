"use client";

import { useEffect, useRef, useState } from "react";
import { saveGuestbookMessage } from "@/app/e/[slug]/livre-dor/actions";
import type { GuestbookPageData } from "@/app/e/[slug]/livre-dor/actions";
import type { StickerPlacement } from "@/lib/types";

// Autosave (débounce) du message + stickers de la page d'un invité — extrait
// de l'ancien GuestbookEditor pour pouvoir dessiner la page directement dans
// le livre (GuestbookBookShell) plutôt que dans un bloc séparé. Toujours
// appelé (règles des hooks), même avant que guestId/initial soient connus ;
// se "réamorce" une seule fois dès que les données de la page arrivent.
export function useGuestbookEntry(slug: string, guestId: string | null, initial: GuestbookPageData | null) {
  const [message, setMessage] = useState("");
  const [stickers, setStickers] = useState<StickerPlacement[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const seededEntryId = useRef<string | null>(null);
  const skipNextSave = useRef(true);

  useEffect(() => {
    if (!initial || seededEntryId.current === initial.entry.id) return;
    seededEntryId.current = initial.entry.id;
    skipNextSave.current = true;
    setMessage(initial.entry.message);
    setStickers(initial.entry.stickers);
  }, [initial]);

  useEffect(() => {
    if (!guestId || !initial) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setSaving(true);
      await saveGuestbookMessage(slug, guestId, message, stickers);
      setSaving(false);
      setSavedOnce(true);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, stickers, guestId, initial]);

  return { message, setMessage, stickers, setStickers, saving, savedOnce, ready: !!initial };
}
