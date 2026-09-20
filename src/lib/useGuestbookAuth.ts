"use client";

import { useCallback, useEffect, useState } from "react";

// Mémorise l'identifiant de la page du livre d'or d'un invité (par mariage),
// sans compte : la valeur retenue est le guest_id renvoyé après vérification
// du prénom + code PIN côté serveur.
export function useGuestbookAuth(slug: string) {
  const key = `eclats:livreDor:${slug}`;
  const [guestId, setGuestId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(key);
      if (v) setGuestId(v);
    } catch {
      /* localStorage indisponible : on continue sans mémoriser */
    } finally {
      setLoaded(true);
    }
  }, [key]);

  const save = useCallback(
    (id: string) => {
      setGuestId(id);
      try {
        window.localStorage.setItem(key, id);
      } catch {
        /* ignoré */
      }
    },
    [key]
  );

  const clear = useCallback(() => {
    setGuestId(null);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignoré */
    }
  }, [key]);

  return { guestId, loaded, save, clear };
}
