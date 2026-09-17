"use client";

import { useState } from "react";
import { downloadSelection } from "@/lib/downloadSelection";

export type AlbumItem = {
  id: string;
  url: string;
  kind: "image" | "video";
  filename: string;
};

export default function GuestAlbum({ items }: { items: AlbumItem[] }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function downloadSelected() {
    const toDownload = items.filter((it) => selected.has(it.id));
    if (toDownload.length === 0) return;
    setDownloading(`0/${toDownload.length}`);
    try {
      await downloadSelection(
        toDownload.map((it) => ({ url: it.url, filename: it.filename })),
        (done, total) => setDownloading(`${done}/${total}`)
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur pendant le téléchargement");
    } finally {
      setDownloading(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-[24px]" style={{ background: "var(--sage-tint)", color: "var(--sage)" }}>
          📷
        </div>
        <p className="font-semibold">Aucune photo pour l&apos;instant</p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
          Reviens un peu plus tard, les photos partagées apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="chip">
          {items.length} photo{items.length > 1 ? "s" : ""}
        </span>
        <button
          onClick={() => (selecting ? exitSelection() : setSelecting(true))}
          className="chip ml-auto"
          style={{ cursor: "pointer", fontWeight: 600 }}
        >
          {selecting ? "Annuler" : "☑ Sélectionner"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it) => {
          const isSelected = selected.has(it.id);
          return (
            <div
              key={it.id}
              className="card overflow-hidden"
              onClick={() => (selecting ? toggleSelect(it.id) : undefined)}
              style={{ cursor: selecting ? "pointer" : "default" }}
            >
              <div className="relative" style={{ aspectRatio: "1", background: "var(--surface)" }}>
                {it.kind === "video" ? (
                  <video src={it.url} controls={!selecting} playsInline className="h-full w-full object-cover" />
                ) : selecting ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <a href={it.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.url} alt="" className="h-full w-full object-cover" />
                  </a>
                )}
                {selecting && (
                  <span
                    className="absolute right-1.5 top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full text-[12px]"
                    style={{
                      background: isSelected ? "var(--sage)" : "rgba(0,0,0,.45)",
                      color: isSelected ? "var(--on-accent)" : "white",
                    }}
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selecting && selected.size > 0 && (
        <div
          className="fixed inset-x-4 bottom-5 z-20 mx-auto flex max-w-app items-center gap-2.5 rounded-[14px] px-4 py-3.5 text-sm shadow-lift"
          style={{ background: "var(--ink)", color: "var(--bg)" }}
        >
          <span className="font-semibold">
            {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
          <button
            onClick={downloadSelected}
            disabled={!!downloading}
            className="btn btn-primary ml-auto"
            style={{ padding: "8px 16px" }}
          >
            {downloading ? `Préparation… ${downloading}` : "⬇ Télécharger"}
          </button>
        </div>
      )}
    </div>
  );
}
