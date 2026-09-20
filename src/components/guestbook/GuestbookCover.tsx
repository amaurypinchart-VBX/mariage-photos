import StaticStickers from "./StaticStickers";
import type { StickerPlacement } from "@/lib/types";

const ROTATIONS = [-6, 4, -3, 7];

export default function GuestbookCover({
  coupleNames,
  title,
  message,
  stickers,
  photos,
}: {
  coupleNames: string;
  title: string | null;
  message: string | null;
  stickers: StickerPlacement[];
  photos: { id: string; url: string }[];
}) {
  return (
    <div
      className="relative overflow-hidden rounded-card border p-6 text-center"
      style={{
        borderColor: "var(--line)",
        background: "linear-gradient(160deg, var(--sage-tint), var(--champ-tint))",
        boxShadow: "0 18px 40px -22px rgba(20,28,20,.35)",
      }}
    >
      <div className="eyebrow" style={{ color: "var(--sage)" }}>
        Livre d&apos;or
      </div>
      <h1 className="display mt-1 text-[28px] leading-[1.1]">{title || coupleNames}</h1>
      {message && (
        <p className="mt-2" style={{ fontFamily: "var(--font-hand)", fontSize: "22px", color: "var(--ink)" }}>
          {message}
        </p>
      )}

      {photos.length > 0 && (
        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-3 py-2">
          {photos.slice(0, 4).map((p, i) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-[10px] border-4 shadow-lift"
              style={{
                borderColor: "#fff",
                width: 92,
                height: 92,
                transform: `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)`,
                background: "var(--surface-2)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <StaticStickers stickers={stickers} />
    </div>
  );
}
