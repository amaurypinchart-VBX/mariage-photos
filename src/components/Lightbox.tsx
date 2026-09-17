"use client";

import { useCallback, useEffect, useRef } from "react";

export type LightboxMedia = {
  id: string;
  url: string;
  kind: "image" | "video";
};

export default function Lightbox<T extends LightboxMedia>({
  items,
  index,
  onClose,
  onIndexChange,
  renderCaption,
  renderFooter,
}: {
  items: T[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  renderCaption?: (item: T) => React.ReactNode;
  renderFooter?: (item: T) => React.ReactNode;
}) {
  const count = items.length;
  const current = items[index];
  const touchStartX = useRef<number | null>(null);

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + count) % count);
  }, [index, count, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % count);
  }, [index, count, onIndexChange]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,.92)" }}
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 40 || count < 2) return;
        if (delta > 0) goPrev();
        else goNext();
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[13px] font-medium" style={{ opacity: 0.8 }}>
          {index + 1} / {count}
        </span>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="text-[22px] leading-none"
          style={{ cursor: "pointer" }}
        >
          ✕
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center px-2"
        onClick={(e) => e.stopPropagation()}
      >
        {count > 1 && (
          <button
            onClick={goPrev}
            aria-label="Photo précédente"
            className="absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-full text-[20px] text-white"
            style={{ background: "rgba(255,255,255,.12)", cursor: "pointer" }}
          >
            ‹
          </button>
        )}

        {current.kind === "video" ? (
          <video
            key={current.id}
            src={current.url}
            controls
            playsInline
            className="max-h-full max-w-full"
            style={{ maxHeight: "80vh" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={current.url}
            alt=""
            className="max-h-full max-w-full object-contain"
            style={{ maxHeight: "80vh" }}
          />
        )}

        {count > 1 && (
          <button
            onClick={goNext}
            aria-label="Photo suivante"
            className="absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-full text-[20px] text-white"
            style={{ background: "rgba(255,255,255,.12)", cursor: "pointer" }}
          >
            ›
          </button>
        )}
      </div>

      {(renderCaption || renderFooter) && (
        <div className="px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
          {renderCaption && (
            <div className="mb-2 text-[13px]" style={{ opacity: 0.85 }}>
              {renderCaption(current)}
            </div>
          )}
          {renderFooter && renderFooter(current)}
        </div>
      )}
    </div>
  );
}
