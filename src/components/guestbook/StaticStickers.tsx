import type { StickerPlacement } from "@/lib/types";

// Rendu non-interactif des stickers d'une page (admin, couverture) — même
// positionnement que StickerCanvas, mais sans drag/resize/rotate.
export default function StaticStickers({ stickers }: { stickers: StickerPlacement[] }) {
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
            fontSize: "30px",
            lineHeight: 1,
          }}
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}
