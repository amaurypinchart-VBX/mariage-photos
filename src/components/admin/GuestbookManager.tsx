"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Guest, GuestbookEntry, GuestbookMedia } from "@/lib/types";

export type GuestPage = {
  guest: Guest;
  entry: GuestbookEntry;
  media: (GuestbookMedia & { url: string })[];
};

export default function GuestbookManager({ initial }: { initial: GuestPage[] }) {
  const [pages, setPages] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(guestId: string) {
    if (!confirm("Supprimer définitivement cette page (et ses médias) ?")) return;
    setDeleting(guestId);
    const supabase = createClient();
    const { error } = await supabase.from("guests").delete().eq("id", guestId);
    setDeleting(null);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setPages((prev) => prev.filter((p) => p.guest.id !== guestId));
  }

  if (pages.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div
          className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-[24px]"
          style={{ background: "var(--sage-tint)", color: "var(--sage)" }}
        >
          💌
        </div>
        <p className="font-semibold">Aucune page pour l&apos;instant</p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
          Les pages de vos invités apparaîtront ici au fur et à mesure.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pages.map(({ guest, entry, media }) => (
        <div key={guest.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[15px] font-semibold">{guest.name}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--ink-faint)" }}>
                Mis à jour le {new Date(entry.updated_at).toLocaleString("fr-FR")}
              </div>
            </div>
            <button
              onClick={() => remove(guest.id)}
              disabled={deleting === guest.id}
              className="flex-none text-[13px] font-semibold"
              style={{ color: "#c0522d", cursor: "pointer" }}
            >
              {deleting === guest.id ? "…" : "Supprimer"}
            </button>
          </div>

          {entry.message && (
            <p className="mt-2.5 whitespace-pre-wrap text-[18px]" style={{ fontFamily: "var(--font-hand)" }}>
              {entry.message}
            </p>
          )}

          {entry.stickers.length > 0 && (
            <div className="mt-1.5 text-[13px]">{entry.stickers.map((s) => s.emoji).join(" ")}</div>
          )}

          {media.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {media.map((m) => (
                <div
                  key={m.id}
                  className="overflow-hidden rounded-[10px] border"
                  style={{ aspectRatio: "1", borderColor: "var(--line)", background: "var(--surface-2)" }}
                >
                  {m.kind === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  )}
                  {m.kind === "video" && <video src={m.url} controls playsInline className="h-full w-full object-cover" />}
                  {m.kind === "audio" && (
                    <div className="flex h-full items-center justify-center p-1">
                      <audio src={m.url} controls className="w-full" style={{ transform: "scale(0.85)" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
