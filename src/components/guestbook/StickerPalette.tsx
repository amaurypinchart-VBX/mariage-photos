"use client";

const STICKERS = ["❤️", "💐", "🌸", "🌷", "🌹", "😍", "🥰", "💍", "🎉", "🥂", "✨", "🕊️", "💌", "😂"];

export default function StickerPalette({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {STICKERS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className="chip text-[18px]"
          style={{ cursor: "pointer", padding: "6px 10px" }}
          aria-label={`Ajouter ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
