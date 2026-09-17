"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LightboxMedia = {
  id: string;
  url: string;
  kind: "image" | "video";
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const TAP_ZOOM_SCALE = 2.5;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

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

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetZoom();
  }, [index, resetZoom]);

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

  function toggleZoom() {
    if (scale > 1) resetZoom();
    else {
      setScale(TAP_ZOOM_SCALE);
      setOffset({ x: 0, y: 0 });
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (current.kind !== "image") return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);

    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      pinchStart.current = { dist: distance(pts[0], pts[1]), scale };
      dragStart.current = null;
      swipeStart.current = null;
      setDragging(true);
    } else if (pointers.current.size === 1) {
      if (scale > 1) {
        dragStart.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
        setDragging(true);
      } else {
        swipeStart.current = { x: e.clientX, y: e.clientY };
      }
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (current.kind !== "image" || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const pts = Array.from(pointers.current.values());
      const newScale = clamp(
        pinchStart.current.scale * (distance(pts[0], pts[1]) / pinchStart.current.dist),
        MIN_SCALE,
        MAX_SCALE
      );
      setScale(newScale);
      if (newScale <= MIN_SCALE + 0.01) setOffset({ x: 0, y: 0 });
    } else if (dragStart.current) {
      setOffset({
        x: dragStart.current.offsetX + (e.clientX - dragStart.current.x),
        y: dragStart.current.offsetY + (e.clientY - dragStart.current.y),
      });
    }
  }

  function endPointer(e: React.PointerEvent<HTMLDivElement>) {
    const wasSwipe = swipeStart.current;
    const last = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      dragStart.current = null;
      swipeStart.current = null;
      setDragging(false);
    }

    if (current.kind !== "image" || !last) return;

    if (wasSwipe && pointers.current.size === 0) {
      const dx = last.x - wasSwipe.x;
      const dy = last.y - wasSwipe.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        if (e.pointerType === "touch") {
          const now = Date.now();
          if (lastTap.current && now - lastTap.current.time < 300 && distance(last, lastTap.current) < 30) {
            toggleZoom();
            lastTap.current = null;
          } else {
            lastTap.current = { time: now, x: last.x, y: last.y };
          }
        }
      } else if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && count > 1) {
        if (dx > 0) goPrev();
        else goNext();
      }
    }
  }

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (current.kind !== "image") return;
    const next = clamp(scale - e.deltaY * 0.0015 * scale, MIN_SCALE, MAX_SCALE);
    setScale(next);
    if (next <= MIN_SCALE + 0.01) setOffset({ x: 0, y: 0 });
  }

  if (!current) return null;

  const isZoomed = scale > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,.92)" }}
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[13px] font-medium" style={{ opacity: 0.8 }}>
          {index + 1} / {count}
        </span>
        <div className="flex items-center gap-3">
          {current.kind === "image" && (
            <button
              onClick={toggleZoom}
              aria-label={isZoomed ? "Dézoomer" : "Zoomer"}
              className="text-[19px] leading-none"
              style={{ cursor: "pointer" }}
            >
              {isZoomed ? "🔍−" : "🔍+"}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-[22px] leading-none"
            style={{ cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2"
        onClick={(e) => e.stopPropagation()}
      >
        {count > 1 && !isZoomed && (
          <button
            onClick={goPrev}
            aria-label="Photo précédente"
            className="absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-full text-[20px] text-white"
            style={{ background: "rgba(255,255,255,.12)", cursor: "pointer" }}
          >
            ‹
          </button>
        )}

        <div
          className="flex h-full w-full items-center justify-center"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onDoubleClick={current.kind === "image" ? toggleZoom : undefined}
          onWheel={current.kind === "image" ? onWheel : undefined}
        >
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
              draggable={false}
              className="max-h-full max-w-full object-contain"
              style={{
                maxHeight: "80vh",
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transition: dragging ? "none" : "transform 0.15s ease-out",
                cursor: isZoomed ? (dragging ? "grabbing" : "grab") : "zoom-in",
              }}
            />
          )}
        </div>

        {count > 1 && !isZoomed && (
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
