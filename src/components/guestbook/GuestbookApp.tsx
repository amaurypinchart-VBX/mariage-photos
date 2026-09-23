"use client";

import { useEffect, useState } from "react";
import { useGuestbookAuth } from "@/lib/useGuestbookAuth";
import { getMyGuestbookPage } from "@/app/e/[slug]/livre-dor/actions";
import type { GuestbookPageData } from "@/app/e/[slug]/livre-dor/actions";
import type { GuestbookCoverData } from "@/lib/guestbookAdmin";
import GuestbookBookShell, { type BookSpread } from "./GuestbookBookShell";
import GuestbookGate from "./GuestbookGate";
import StaticStickers from "./StaticStickers";
import StickerCanvas from "./StickerCanvas";
import StickerPalette from "./StickerPalette";
import MediaAttachments from "./MediaAttachments";
import DestinationPoll from "./DestinationPoll";
import { useGuestbookEntry } from "./useGuestbookEntry";
import type { GuestbookMedia } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function GuestbookApp({
  slug,
  eventId,
  coupleNames,
  cover,
  albumToken,
}: {
  slug: string;
  eventId: string;
  coupleNames: string;
  cover: GuestbookCoverData;
  albumToken?: string;
}) {
  const { guestId, loaded, save, clear } = useGuestbookAuth(slug);
  const [pageData, setPageData] = useState<GuestbookPageData | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<(GuestbookMedia & { url: string })[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

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
      setMedia(result.data.media);
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, guestId, slug, albumToken, clear]);

  const entry = useGuestbookEntry(slug, guestId, pageData);

  if (!loaded) return null;

  // "Authentifié" = a un guestId valide (une erreur de chargement invalide le guestId mémorisé).
  const authed = !!guestId && !(error && !pageData);

  const coverSpread: BookSpread = {
    key: "cover",
    left: (
      <div>
        <div className="eyebrow" style={{ color: "var(--sage)" }}>
          Couverture
        </div>
        <h2 className="display mt-1 text-[22px]">{cover.title || coupleNames}</h2>
        {cover.message && (
          <p className="mt-3" style={{ fontFamily: "var(--font-hand)", fontSize: "24px", color: "var(--ink)" }}>
            {cover.message}
          </p>
        )}
        <div className="relative mt-2" style={{ minHeight: 120 }}>
          <StaticStickers stickers={cover.stickers} />
        </div>
      </div>
    ),
    right: (
      <div>
        <div className="eyebrow" style={{ color: "var(--champ)" }}>
          En photos
        </div>
        {cover.photos.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {cover.photos.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-[10px] border shadow-soft"
                style={{ aspectRatio: "1", borderColor: "rgba(79,97,82,.18)", background: "var(--surface-2)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[13.5px] italic" style={{ color: "var(--ink-faint)" }}>
            Bienvenue dans notre livre d&apos;or !
          </p>
        )}
      </div>
    ),
  };

  const mySpread: BookSpread = {
    key: "moi",
    left: !authed ? (
      <div>
        <div className="eyebrow" style={{ color: "var(--sage)" }}>
          Ta page
        </div>
        <h2 className="display mt-1 text-[20px]">Signe le livre</h2>
        <GuestbookGate
          slug={slug}
          onLoggedIn={(id) => {
            setError(null);
            save(id);
          }}
        />
      </div>
    ) : loadingPage || !entry.ready ? (
      <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>
        Chargement de ta page…
      </p>
    ) : (
      <div className="relative h-full">
        <div className="eyebrow" style={{ color: "var(--sage)" }}>
          {pageData?.guestName}
        </div>
        <textarea
          value={entry.message ?? ""}
          onChange={(e) => entry.setMessage(e.target.value)}
          placeholder="Écris un petit mot pour les mariés…"
          className="relative mt-2 w-full resize-none bg-transparent outline-none"
          style={{ fontFamily: "var(--font-hand)", fontSize: "27px", lineHeight: 1.3, color: "var(--ink)", minHeight: 220 }}
        />
        <StickerCanvas stickers={entry.stickers} onChange={entry.setStickers} />
      </div>
    ),
    right: !authed ? (
      <div>
        <div className="eyebrow" style={{ color: "var(--champ)" }}>
          Souvenirs
        </div>
        <p className="mt-3 text-[13.5px] italic" style={{ color: "var(--ink-faint)" }}>
          Signe à gauche pour déposer tes photos, vidéos et messages vocaux ici.
        </p>
      </div>
    ) : loadingPage || !pageData ? null : (
      <MediaAttachments
        eventId={eventId}
        slug={slug}
        guestId={guestId as string}
        media={media}
        onMediaChange={setMedia}
        albumPhotos={pageData.albumPhotos}
      />
    ),
  };

  return (
    <div>
      <GuestbookBookShell
        coverTitle={cover.title || coupleNames}
        coverEyebrow="Livre d'or"
        spreads={[coverSpread, mySpread]}
        index={pageIndex}
        onIndexChange={setPageIndex}
      />

      {pageIndex === 1 && authed && entry.ready && (
        <>
          <StickerPalette
            onPick={(emoji) =>
              entry.setStickers([...entry.stickers, { id: uid(), emoji, xPct: 50, yPct: 45, scale: 1, rotationDeg: 0 }])
            }
          />
          <p className="mt-2 text-[12px]" style={{ color: "var(--ink-faint)" }}>
            {entry.saving ? "Enregistrement…" : entry.savedOnce ? "Enregistré ✓" : "Ta page est enregistrée automatiquement pendant que tu écris."}
          </p>
        </>
      )}

      {authed && guestId && <DestinationPoll eventId={eventId} slug={slug} guestId={guestId} />}
    </div>
  );
}
