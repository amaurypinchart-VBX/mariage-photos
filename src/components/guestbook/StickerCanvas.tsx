"use client";

import { useRef, useState } from "react";
import type { StickerPlacement } from "@/lib/types";

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function StickerCanvas({
  stickers,
  onChange,
}: {
  stickers: StickerPlacement[];
  onChange: (next: StickerPlacement[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dragState = useRef<{
    id: string;
    startX: number;
    startY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  const handleState = useRef<{
    id: string;
    centerX: number;
    centerY: number;
    startDist: number;
    startAngle: number;
    startScale: number;
    startRotation: number;
  } | null>(null);

  function update(id: string, patch: Partial<StickerPlacement>) {
    onChange(stickers.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSticker(id: string) {
    onChange(stickers.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function onStickerPointerDown(e: React.PointerEvent<HTMLDivElement>, s: StickerPlacement) {
    e.stopPropagation();
    setSelectedId(s.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { id: s.id, startX: e.clientX, startY: e.clientY, startXPct: s.xPct, startYPct: s.yPct };
  }

  function onStickerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
    update(drag.id, {
      xPct: clamp(drag.startXPct + dxPct, 0, 100),
      yPct: clamp(drag.startYPct + dyPct, 0, 100),
    });
  }

  function endDrag() {
    dragState.current = null;
  }

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>, s: StickerPlacement) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + (s.xPct / 100) * rect.width;
    const centerY = rect.top + (s.yPct / 100) * rect.height;
    handleState.current = {
      id: s.id,
      centerX,
      centerY,
      startDist: Math.hypot(e.clientX - centerX, e.clientY - centerY) || 1,
      startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
      startScale: s.scale,
      startRotation: s.rotationDeg,
    };
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const h = handleState.current;
    if (!h) return;
    const dist = Math.hypot(e.clientX - h.centerX, e.clientY - h.centerY);
    const angle = Math.atan2(e.clientY - h.centerY, e.clientX - h.centerX);
    const scale = clamp(h.startScale * (dist / h.startDist), MIN_SCALE, MAX_SCALE);
    const rotationDeg = h.startRotation + ((angle - h.startAngle) * 180) / Math.PI;
    update(h.id, { scale, rotationDeg });
  }

  function endHandle() {
    handleState.current = null;
  }

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ pointerEvents: "none" }}>
      {stickers.map((s) => {
        const isSelected = selectedId === s.id;
        const counterScale = 1 / s.scale;
        return (
          <div
            key={s.id}
            className="absolute select-none"
            style={{
              left: `${s.xPct}%`,
              top: `${s.yPct}%`,
              transform: `translate(-50%, -50%) rotate(${s.rotationDeg}deg) scale(${s.scale})`,
              fontSize: "34px",
              lineHeight: 1,
              cursor: "grab",
              zIndex: isSelected ? 20 : 10,
              pointerEvents: "auto",
              touchAction: "none",
              filter: isSelected ? "drop-shadow(0 2px 6px rgba(0,0,0,.28))" : undefined,
            }}
            onPointerDown={(e) => onStickerPointerDown(e, s)}
            onPointerMove={onStickerPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {s.emoji}
            {isSelected && (
              <>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSticker(s.id);
                  }}
                  className="absolute grid place-items-center rounded-full text-[11px] text-white"
                  style={{
                    top: -10,
                    right: -10,
                    width: 22,
                    height: 22,
                    background: "rgba(0,0,0,.55)",
                    transform: `rotate(${-s.rotationDeg}deg) scale(${counterScale})`,
                  }}
                  aria-label="Supprimer le sticker"
                >
                  ✕
                </button>
                <div
                  onPointerDown={(e) => onHandlePointerDown(e, s)}
                  onPointerMove={onHandlePointerMove}
                  onPointerUp={endHandle}
                  onPointerCancel={endHandle}
                  className="absolute grid place-items-center rounded-full text-[11px] text-white"
                  style={{
                    bottom: -10,
                    right: -10,
                    width: 22,
                    height: 22,
                    background: "var(--sage)",
                    cursor: "nwse-resize",
                    transform: `rotate(${-s.rotationDeg}deg) scale(${counterScale})`,
                  }}
                  aria-label="Redimensionner et pivoter"
                >
                  ↻
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
