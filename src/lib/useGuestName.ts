"use client";

import { useCallback, useEffect, useState } from "react";

// Mémorise le prénom de l'invité localement (par mariage), sans compte.
export function useGuestName(slug: string) {
  const key = `eclats:name:${slug}`;
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(key);
      if (v) setName(v);
    } catch {
      /* localStorage indisponible : on continue sans mémoriser */
    }
  }, [key]);

  const save = useCallback(
    (value: string) => {
      const v = value.trim();
      setName(v);
      try {
        window.localStorage.setItem(key, v);
      } catch {
        /* ignoré */
      }
    },
    [key]
  );

  return { name, save };
}
