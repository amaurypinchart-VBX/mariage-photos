"use client";

import { useEffect, useState } from "react";
import { useGuestbookAuth } from "@/lib/useGuestbookAuth";
import { getMyGuestbookPage } from "@/app/e/[slug]/livre-dor/actions";
import type { GuestbookPageData } from "@/app/e/[slug]/livre-dor/actions";
import GuestbookGate from "./GuestbookGate";
import GuestbookEditor from "./GuestbookEditor";

export default function GuestbookApp({
  slug,
  eventId,
  albumToken,
}: {
  slug: string;
  eventId: string;
  albumToken?: string;
}) {
  const { guestId, loaded, save, clear } = useGuestbookAuth(slug);
  const [pageData, setPageData] = useState<GuestbookPageData | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded || !guestId) return;
    let cancelled = false;
    setLoadingPage(true);
    getMyGuestbookPage(slug, guestId, albumToken).then((result) => {
      if (cancelled) return;
      setLoadingPage(false);
      if (!result.ok) {
        setError(result.error);
        clear();
        return;
      }
      setPageData(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, guestId, slug, albumToken, clear]);

  if (!loaded) return null;

  if (!guestId || (error && !pageData)) {
    return (
      <GuestbookGate
        slug={slug}
        onLoggedIn={(id) => {
          setError(null);
          save(id);
        }}
      />
    );
  }

  if (loadingPage || !pageData) {
    return (
      <p className="mt-6 text-[14px]" style={{ color: "var(--ink-soft)" }}>
        Chargement de ta page…
      </p>
    );
  }

  return <GuestbookEditor slug={slug} eventId={eventId} guestId={guestId} initial={pageData} />;
}
