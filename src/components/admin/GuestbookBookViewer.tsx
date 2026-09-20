"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GuestPage } from "@/lib/guestbookAdmin";
import type { GuestbookCoverData } from "@/lib/guestbookAdmin";
import StaticStickers from "@/components/guestbook/StaticStickers";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const paperStyle: React.CSSProperties = {
  background: "repeating-linear-gradient(#fdfaf1, #fdfaf1 33px, rgba(79,97,82,.08) 34px)",
};

export default function GuestbookBookViewer({
  coupleNames,
  cover,
  pages,
}: {
  coupleNames: string;
  cover: GuestbookCoverData;
  pages: GuestPage[];
}) {
  const [localPages, setLocalPages] = useState(pages);
  const [deleting, setDeleting] = useState<string | null>(null);
  const sorted = useMemo(
    () => [...localPages].sort((a, b) => a.guest.name.localeCompare(b.guest.name, "fr")),
    [localPages]
  );
  const hasCover = !!(cover.title || cover.message || cover.stickers.length > 0 || cover.photos.length > 0);
  const count = (hasCover ? 1 : 0) + sorted.length;
  const [index, setIndex] = useState(0);

  async function removeGuest(guestId: string) {
    if (!confirm("Supprimer définitivement cette page (et ses médias) ?")) return;
    setDeleting(guestId);
    const supabase = createClient();
    const { error } = await supabase.from("guests").delete().eq("id", guestId);
    setDeleting(null);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setLocalPages((prev) => prev.filter((p) => p.guest.id !== guestId));
    setIndex((i) => Math.max(0, i - 1));
  }

  if (count === 0) {
    return (
      <div className="card p-8 text-center">
        <div
          className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-[24px]"
          style={{ background: "var(--sage-tint)", color: "var(--sage)" }}
        >
          💌
        </div>
        <p className="font-semibold">Le livre d&apos;or est encore vide</p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
          Ajoute une couverture ci-dessus, et les pages de vos invités apparaîtront ici au fur et à mesure.
        </p>
      </div>
    );
  }

  const safeIndex = Math.min(index, count - 1);
  const goPrev = () => setIndex((i) => (Math.min(i, count - 1) - 1 + count) % count);
  const goNext = () => setIndex((i) => (Math.min(i, count - 1) + 1) % count);

  const isCoverPage = hasCover && safeIndex === 0;
  const guestPage = !isCoverPage ? sorted[safeIndex - (hasCover ? 1 : 0)] : null;

  return (
    <div>
      <div className="mx-auto flex max-w-[720px] items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={goPrev}
          className="grid h-11 w-11 flex-none place-items-center rounded-full text-[20px]"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)", cursor: "pointer" }}
          aria-label="Page précédente"
        >
          ‹
        </button>

        {/* Reliure / couverture du livre */}
        <div
          className="min-w-0 flex-1 rounded-[22px] p-2.5 sm:p-3.5"
          style={{
            background: "linear-gradient(155deg, var(--sage-strong), var(--sage))",
            boxShadow: "0 18px 40px -18px rgba(20,28,20,.55), 0 2px 0 rgba(255,255,255,.08) inset",
          }}
        >
          <div
            className="relative grid grid-cols-1 overflow-hidden rounded-[14px] sm:grid-cols-2"
            style={{ background: "#fdfaf1", minHeight: 320 }}
          >
            {/* Ombre de la reliure au centre (visible en 2 colonnes) */}
            <div
              className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-10 -translate-x-1/2 sm:block"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,.10), rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,.10))",
              }}
            />

            {isCoverPage ? (
              <>
                {/* Page de gauche : titre + mot d'intro de la couverture */}
                <div
                  className="relative flex flex-col justify-center border-b p-5 text-center sm:border-b-0 sm:border-r"
                  style={{ ...paperStyle, borderColor: "rgba(79,97,82,.14)" }}
                >
                  <div className="eyebrow" style={{ color: "var(--sage)" }}>
                    Couverture
                  </div>
                  <h2 className="display mt-1 text-[24px]">{cover.title || coupleNames}</h2>
                  {cover.message && (
                    <p className="mt-3" style={{ fontFamily: "var(--font-hand)", fontSize: "24px", color: "var(--ink)" }}>
                      {cover.message}
                    </p>
                  )}
                  <StaticStickers stickers={cover.stickers} />
                </div>

                {/* Page de droite : photos de couverture */}
                <div className="relative p-5" style={paperStyle}>
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
                      Aucune photo de couverture pour l&apos;instant.
                    </p>
                  )}
                </div>
              </>
            ) : guestPage ? (
              <>
                {/* Page de gauche : le mot de l'invité */}
                <div
                  className="relative border-b p-5 sm:border-b-0 sm:border-r"
                  style={{ ...paperStyle, borderColor: "rgba(79,97,82,.14)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="eyebrow" style={{ color: "var(--sage)" }}>
                        {formatDate(guestPage.entry.updated_at)}
                      </div>
                      <div className="display mt-1 text-[22px]">{guestPage.guest.name}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGuest(guestPage.guest.id)}
                      disabled={deleting === guestPage.guest.id}
                      className="flex-none text-[12px] font-semibold"
                      style={{ color: "#c0522d", cursor: "pointer" }}
                    >
                      {deleting === guestPage.guest.id ? "…" : "Supprimer"}
                    </button>
                  </div>

                  <div className="relative mt-4" style={{ minHeight: 160 }}>
                    {guestPage.entry.message ? (
                      <p
                        className="whitespace-pre-wrap"
                        style={{ fontFamily: "var(--font-hand)", fontSize: "27px", lineHeight: 1.3, color: "var(--ink)" }}
                      >
                        {guestPage.entry.message}
                      </p>
                    ) : (
                      <p className="italic" style={{ fontFamily: "var(--font-hand)", fontSize: "22px", color: "var(--ink-faint)" }}>
                        Cette page n&apos;a pas encore été écrite…
                      </p>
                    )}
                    <StaticStickers stickers={guestPage.entry.stickers} />
                  </div>
                </div>

                {/* Page de droite : les souvenirs joints */}
                <div className="relative p-5" style={paperStyle}>
                  <div className="eyebrow" style={{ color: "var(--champ)" }}>
                    Souvenirs joints
                  </div>
                  {guestPage.media.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      {guestPage.media.map((m) => (
                        <div
                          key={m.id}
                          className="overflow-hidden rounded-[10px] border shadow-soft"
                          style={{ aspectRatio: "1", borderColor: "rgba(79,97,82,.18)", background: "var(--surface-2)" }}
                        >
                          {m.kind === "image" && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.url} alt="" className="h-full w-full object-cover" />
                          )}
                          {m.kind === "video" && (
                            <video src={m.url} controls playsInline className="h-full w-full object-cover" />
                          )}
                          {m.kind === "audio" && (
                            <div className="flex h-full items-center justify-center p-1">
                              <audio src={m.url} controls className="w-full" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-[13.5px] italic" style={{ color: "var(--ink-faint)" }}>
                      Aucune photo, vidéo ou message vocal joint.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={goNext}
          className="grid h-11 w-11 flex-none place-items-center rounded-full text-[20px]"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)", cursor: "pointer" }}
          aria-label="Page suivante"
        >
          ›
        </button>
      </div>

      <div className="mt-3 text-center text-[12px]" style={{ color: "var(--ink-faint)" }}>
        — Page {safeIndex + 1} sur {count} —
      </div>
    </div>
  );
}
