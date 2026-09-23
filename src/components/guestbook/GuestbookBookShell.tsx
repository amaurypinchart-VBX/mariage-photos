"use client";

import { useState } from "react";

export type BookSpread = {
  key: string;
  left: React.ReactNode;
  right: React.ReactNode;
};

// Kraft brun, reliure spirale et ruban — l'objet "vrai livre" tenu en main,
// pas une simple carte de couleur sauge comme avant.
const KRAFT = "linear-gradient(155deg, #a17f53, #6f5334)";
const KRAFT_STRONG = "linear-gradient(160deg, #7c5f3c, #5a4327)";
export const PAPER_STYLE: React.CSSProperties = {
  background: "repeating-linear-gradient(#fdfaf1, #fdfaf1 33px, rgba(79,97,82,.08) 34px)",
};
const NOISE_BG =
  'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")';

function SpiralRings({ side = "left" }: { side?: "left" | "center" }) {
  return (
    <div
      aria-hidden
      className={
        side === "left"
          ? "pointer-events-none absolute inset-y-5 left-2 w-2.5"
          : "pointer-events-none absolute inset-y-3 left-1/2 hidden w-3 -translate-x-1/2 sm:block"
      }
      style={{
        backgroundImage: `radial-gradient(circle, rgba(${
          side === "left" ? "20,14,8" : "79,97,82"
        },${side === "left" ? ".62" : ".35"}) 2.4px, transparent 3px)`,
        backgroundSize: "100% 21px",
        backgroundRepeat: "repeat-y",
      }}
    />
  );
}

function ClosedCover({
  title,
  eyebrow,
  onOpen,
}: {
  title: string;
  eyebrow?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="gb-book-open relative block w-full overflow-hidden rounded-[22px] text-left"
      style={{ cursor: "pointer", border: "none", padding: 0 }}
      aria-label="Ouvrir le livre d'or"
    >
      {/* tranche de pages qui dépasse à droite */}
      <div
        className="pointer-events-none absolute inset-y-4 -right-1 w-3 rounded-r-[10px]"
        style={{ background: "#f2ead9" }}
      />
      <div
        className="pointer-events-none absolute inset-y-6 right-0 w-2 rounded-r-[8px]"
        style={{ background: "#e7dcc2" }}
      />

      <div
        className="relative overflow-hidden rounded-[22px] px-8 py-16 text-center"
        style={{
          background: KRAFT,
          boxShadow: "0 24px 50px -20px rgba(30,20,10,.55), 0 2px 0 rgba(255,255,255,.1) inset",
          minHeight: 400,
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[.16]" style={{ backgroundImage: NOISE_BG, mixBlendMode: "overlay" }} />
        <SpiralRings side="left" />

        {/* ruban noué */}
        <div
          className="pointer-events-none absolute right-[16%] top-0 h-full w-[9px]"
          style={{ background: "linear-gradient(180deg, rgba(24,20,16,.88), rgba(24,20,16,.68))" }}
        />
        <div
          className="pointer-events-none absolute h-8 w-8 rounded-full"
          style={{ right: "calc(16% - 12px)", bottom: 30, background: "rgba(24,20,16,.88)" }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            right: "calc(16% - 20px)",
            bottom: 26,
            width: 0,
            height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderRight: "14px solid rgba(24,20,16,.8)",
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            right: "calc(16% - 20px)",
            bottom: 12,
            width: 0,
            height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderRight: "14px solid rgba(24,20,16,.8)",
          }}
        />

        <div className="relative eyebrow" style={{ color: "rgba(253,247,235,.7)" }}>
          {eyebrow ?? "Livre d'or"}
        </div>
        <div className="relative mx-auto mt-5 max-w-[220px]" style={{ fontFamily: "var(--font-hand)", fontSize: 46, lineHeight: 1.08, color: "#fdf7eb" }}>
          {title}
        </div>
        <div className="relative mx-auto mt-6 flex items-center justify-center gap-2" style={{ color: "rgba(253,247,235,.55)" }}>
          <span>🌾</span>
          <span className="h-px w-14" style={{ background: "rgba(253,247,235,.4)" }} />
          <span>🌿</span>
        </div>
        <p className="gb-tap-hint relative mt-7 text-[13px] font-semibold" style={{ color: "rgba(253,247,235,.85)" }}>
          Touchez pour ouvrir
        </p>
      </div>
    </button>
  );
}

function OpenSpread({
  spreads,
  index,
  onIndex,
  onClose,
}: {
  spreads: BookSpread[];
  index: number;
  onIndex: (i: number) => void;
  onClose?: () => void;
}) {
  const count = spreads.length;
  const safe = Math.min(Math.max(index, 0), count - 1);
  const spread = spreads[safe];
  const goPrev = () => onIndex((safe - 1 + count) % count);
  const goNext = () => onIndex((safe + 1) % count);

  return (
    <div className="gb-book-open">
      <div className="mx-auto flex max-w-[760px] items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={count < 2}
          className="grid h-11 w-11 flex-none place-items-center rounded-full text-[20px] disabled:opacity-40"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)", cursor: count < 2 ? "default" : "pointer" }}
          aria-label="Page précédente"
        >
          ‹
        </button>

        <div
          className="min-w-0 flex-1 rounded-[22px] p-2.5 sm:p-3.5"
          style={{
            background: KRAFT_STRONG,
            boxShadow: "0 18px 40px -18px rgba(30,20,10,.55), 0 2px 0 rgba(255,255,255,.1) inset",
          }}
        >
          <div
            className="relative grid grid-cols-1 overflow-hidden rounded-[14px] sm:grid-cols-2"
            style={{ background: "#fdfaf1", minHeight: 360 }}
          >
            <SpiralRings side="center" />
            <div
              key={`${spread.key}-l`}
              className="gb-page-in relative border-b p-5 sm:border-b-0 sm:border-r"
              style={{ ...PAPER_STYLE, borderColor: "rgba(79,97,82,.14)" }}
            >
              {spread.left}
            </div>
            <div key={`${spread.key}-r`} className="gb-page-in relative p-5" style={PAPER_STYLE}>
              {spread.right}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={count < 2}
          className="grid h-11 w-11 flex-none place-items-center rounded-full text-[20px] disabled:opacity-40"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)", cursor: count < 2 ? "default" : "pointer" }}
          aria-label="Page suivante"
        >
          ›
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 text-[12px]" style={{ color: "var(--ink-faint)" }}>
        <span>— Page {safe + 1} sur {count} —</span>
        {onClose && (
          <button type="button" onClick={onClose} className="font-semibold underline" style={{ cursor: "pointer" }}>
            Fermer le livre
          </button>
        )}
      </div>
    </div>
  );
}

export default function GuestbookBookShell({
  coverTitle,
  coverEyebrow,
  spreads,
  startOpen = false,
  showCloseButton = false,
  index,
  onIndexChange,
}: {
  coverTitle: string;
  coverEyebrow?: string;
  spreads: BookSpread[];
  /** Admin : le livre est déjà ouvert (outil de gestion, pas de mise en scène). */
  startOpen?: boolean;
  /** Permet de refermer le livre (utile en admin pour prévisualiser ce que voient les invités). */
  showCloseButton?: boolean;
  /** Page courante contrôlée depuis le parent (ex. pour révéler la palette de stickers uniquement sur "sa" page). */
  index?: number;
  onIndexChange?: (i: number) => void;
}) {
  const [open, setOpen] = useState(startOpen);
  const [localIndex, setLocalIndex] = useState(0);
  const idx = index ?? localIndex;

  function setIdx(i: number) {
    if (onIndexChange) onIndexChange(i);
    else setLocalIndex(i);
  }

  if (!open) {
    return <ClosedCover title={coverTitle} eyebrow={coverEyebrow} onOpen={() => setOpen(true)} />;
  }

  return (
    <OpenSpread
      spreads={spreads}
      index={idx}
      onIndex={setIdx}
      onClose={showCloseButton ? () => setOpen(false) : undefined}
    />
  );
}
