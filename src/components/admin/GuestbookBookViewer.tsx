"use client";

import { useMemo, useState } from "react";
import type { GuestPage } from "@/lib/guestbookAdmin";
import type { StickerPlacement } from "@/lib/types";

function StaticStickers({ stickers }: { stickers: StickerPlacement[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {stickers.map((s) => (
        <span
          key={s.id}
          className="absolute select-none"
          style={{
            left: `${s.xPct}%`,
            top: `${s.yPct}%`,
            transform: `translate(-50%, -50%) rotate(${s.rotationDeg}deg) scale(${s.scale})`,
            fontSize: "34px",
            lineHeight: 1,
          }}
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}

export default function GuestbookBookViewer({ pages }: { pages: GuestPage[] }) {
  const sorted = useMemo(() => [...pages].sort((a, b) => a.guest.name.localeCompare(b.guest.name, "fr")), [pages]);
  const [index, setIndex] = useState(0);
  const count = sorted.length;

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
          Les pages de vos invités apparaîtront ici au fur et à mesure.
        </p>
      </div>
    );
  }

  const safeIndex = Math.min(index, count - 1);
  const { guest, entry, media } = sorted[safeIndex];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => (Math.min(i, count - 1) - 1 + count) % count)}
          className="grid h-9 w-9 place-items-center rounded-full text-[18px]"
          style={{ background: "var(--surface-2)", cursor: "pointer" }}
          aria-label="Page précédente"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-[15px] font-semibold">{guest.name}</div>
          <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
            {safeIndex + 1} / {count}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIndex((i) => (Math.min(i, count - 1) + 1) % count)}
          className="grid h-9 w-9 place-items-center rounded-full text-[18px]"
          style={{ background: "var(--surface-2)", cursor: "pointer" }}
          aria-label="Page suivante"
        >
          ›
        </button>
      </div>

      <div
        className="relative overflow-hidden rounded-card border p-5"
        style={{
          borderColor: "var(--line)",
          minHeight: 260,
          background: "linear-gradient(160deg, var(--sage-tint), var(--champ-tint))",
        }}
      >
        {entry.message ? (
          <p
            className="whitespace-pre-wrap"
            style={{ fontFamily: "var(--font-hand)", fontSize: "28px", lineHeight: 1.3, color: "var(--ink)" }}
          >
            {entry.message}
          </p>
        ) : (
          <p className="text-[15px] italic" style={{ color: "var(--ink-faint)" }}>
            Page vierge pour l&apos;instant…
          </p>
        )}
        <StaticStickers stickers={entry.stickers} />
      </div>

      {media.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {media.map((m) => (
            <div
              key={m.id}
              className="overflow-hidden rounded-[12px] border"
              style={{ aspectRatio: "1", borderColor: "var(--line)", background: "var(--surface-2)" }}
            >
              {m.kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
              {m.kind === "video" && <video src={m.url} controls playsInline className="h-full w-full object-cover" />}
              {m.kind === "audio" && (
                <div className="flex h-full items-center justify-center p-1">
                  <audio src={m.url} controls className="w-full" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
        Dernière mise à jour le {new Date(entry.updated_at).toLocaleString("fr-FR")}
      </p>
    </div>
  );
}
