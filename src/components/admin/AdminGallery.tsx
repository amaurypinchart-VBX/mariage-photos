"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadSelection } from "@/lib/downloadSelection";
import Lightbox from "@/components/Lightbox";
import type { GuestUpload, PhotoChallenge, ShareLink } from "@/lib/types";

const NONE = "__none__";
const ALL = "__all__";

export default function AdminGallery({
  uploads,
  urlByPath,
  challenges,
  shareLinks,
}: {
  uploads: GuestUpload[];
  urlByPath: Record<string, string>;
  challenges: PhotoChallenge[];
  shareLinks: ShareLink[];
}) {
  const [items, setItems] = useState(uploads);

  const challengeLabel = useMemo(() => {
    const m: Record<string, string> = {};
    challenges.forEach((c) => (m[c.id] = c.label));
    return m;
  }, [challenges]);

  const linkLabel = useMemo(() => {
    const m: Record<string, string> = {};
    shareLinks.forEach((l) => (m[l.id] = l.label));
    return m;
  }, [shareLinks]);

  const guests = useMemo(() => {
    const s = new Set<string>();
    items.forEach((u) => {
      const n = (u.guest_name || "").trim();
      if (n) s.add(n);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "fr"));
  }, [items]);

  const [guestFilter, setGuestFilter] = useState("");
  const [challengeFilter, setChallengeFilter] = useState("");

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = items.filter((u) => {
    if (guestFilter && (u.guest_name || "").trim() !== guestFilter) return false;
    if (challengeFilter === NONE && u.challenge_id) return false;
    if (challengeFilter && challengeFilter !== NONE && u.challenge_id !== challengeFilter)
      return false;
    return true;
  });

  const lightboxItems = filtered
    .filter((u) => u.kind === "image" && urlByPath[u.storage_path])
    .map((u) => ({ ...u, url: urlByPath[u.storage_path] }));

  useEffect(() => {
    setLightboxIndex(null);
  }, [guestFilter, challengeFilter]);

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

  function visibilityBadge(u: GuestUpload): string | null {
    if (u.visible_to_all) return "🌍 Tout";
    if (u.share_link_id && linkLabel[u.share_link_id]) return linkLabel[u.share_link_id];
    return null;
  }

  function visibilityValue(u: GuestUpload): string {
    if (u.visible_to_all) return ALL;
    if (u.share_link_id) return u.share_link_id;
    return NONE;
  }

  async function applyVisibility(ids: string[], value: string) {
    if (ids.length === 0) return;
    const patch =
      value === NONE
        ? { share_link_id: null, visible_to_all: false }
        : value === ALL
        ? { share_link_id: null, visible_to_all: true }
        : { share_link_id: value, visible_to_all: false };

    setApplying(true);
    const supabase = createClient();
    const { error } = await supabase.from("guest_uploads").update(patch).in("id", ids);
    setApplying(false);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setItems((prev) => prev.map((u) => (ids.includes(u.id) ? { ...u, ...patch } : u)));
  }

  async function downloadSelected() {
    const ids = Array.from(selected);
    const toDownload = items.filter((u) => ids.includes(u.id) && urlByPath[u.storage_path]);
    if (toDownload.length === 0) return;
    setDownloading(`0/${toDownload.length}`);
    try {
      await downloadSelection(
        toDownload.map((u) => ({
          url: urlByPath[u.storage_path],
          filename: filenameFor(u),
        })),
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
          Les photos de vos invités apparaîtront ici en temps réel.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="chip" value={guestFilter} onChange={(e) => setGuestFilter(e.target.value)} style={{ cursor: "pointer" }}>
          <option value="">Tous les invités</option>
          {guests.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select className="chip" value={challengeFilter} onChange={(e) => setChallengeFilter(e.target.value)} style={{ cursor: "pointer" }}>
          <option value="">Tous les défis</option>
          <option value={NONE}>Hors défi (photos libres)</option>
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label.length > 42 ? c.label.slice(0, 42) + "…" : c.label}
            </option>
          ))}
        </select>
        <span className="chip" style={{ marginLeft: "auto" }}>
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </span>
        <button
          onClick={() => (selecting ? exitSelection() : setSelecting(true))}
          className="chip"
          style={{ cursor: "pointer", fontWeight: 600 }}
        >
          {selecting ? "Annuler" : "☑ Sélectionner"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((u) => {
          const url = urlByPath[u.storage_path];
          const isSelected = selected.has(u.id);
          const badge = visibilityBadge(u);
          const openable = !selecting && u.kind === "image" && !!url;
          return (
            <div
              key={u.id}
              className="card overflow-hidden"
              onClick={() => {
                if (selecting) {
                  toggleSelect(u.id);
                  return;
                }
                if (openable) {
                  const idx = lightboxItems.findIndex((x) => x.id === u.id);
                  if (idx >= 0) setLightboxIndex(idx);
                }
              }}
              style={selecting || openable ? { cursor: "pointer" } : undefined}
            >
              <div className="relative" style={{ aspectRatio: "1", background: "var(--surface)" }}>
                {url ? (
                  u.kind === "video" ? (
                    <video src={url} controls={!selecting} playsInline className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="grid h-full place-items-center text-[12px]" style={{ color: "var(--ink-faint)" }}>
                    aperçu indisponible
                  </div>
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
                {u.challenge_id && challengeLabel[u.challenge_id] && (
                  <span className="absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[15px]" title={challengeLabel[u.challenge_id]} style={{ background: "rgba(0,0,0,.5)" }}>
                    {firstEmoji(challengeLabel[u.challenge_id])}
                  </span>
                )}
                {badge && (
                  <span
                    className="absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={{ background: "rgba(0,0,0,.55)", color: "white" }}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                <span className="truncate text-[12.5px] font-medium">
                  {u.guest_name || "Anonyme"}
                </span>
                {url && !selecting && (
                  <a
                    href={url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-none text-[13px]"
                    style={{ color: "var(--sage)" }}
                    title="Ouvrir / télécharger"
                  >
                    ⬇
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={lightboxItems}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          renderCaption={(item) => (
            <span>
              {item.guest_name || "Anonyme"}
              {item.challenge_id && challengeLabel[item.challenge_id]
                ? ` · ${challengeLabel[item.challenge_id]}`
                : ""}
            </span>
          )}
          renderFooter={(item) => (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={item.url}
                download
                target="_blank"
                rel="noreferrer"
                className="chip"
                style={{ cursor: "pointer" }}
              >
                ⬇ Télécharger
              </a>
              <select
                className="chip"
                style={{ cursor: "pointer", color: "var(--ink)", marginLeft: "auto" }}
                value={visibilityValue(item)}
                disabled={applying}
                onChange={(e) => applyVisibility([item.id], e.target.value)}
              >
                <option value={NONE}>Pas partagé</option>
                <option value={ALL}>🌍 Tout</option>
                {shareLinks.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        />
      )}

      {selecting && selected.size > 0 && (
        <div
          className="fixed inset-x-4 bottom-5 z-20 mx-auto flex max-w-app flex-wrap items-center gap-2.5 rounded-[14px] px-4 py-3.5 text-sm shadow-lift"
          style={{ background: "var(--ink)", color: "var(--bg)" }}
        >
          <span className="font-semibold">
            {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
          <select
            className="chip"
            style={{ cursor: "pointer", color: "var(--ink)" }}
            value=""
            disabled={applying}
            onChange={(e) => {
              if (e.target.value) applyVisibility(Array.from(selected), e.target.value);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Partager avec…
            </option>
            <option value={NONE}>Pas partagé</option>
            <option value={ALL}>🌍 Tout</option>
            {shareLinks.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
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

function filenameFor(u: GuestUpload): string {
  const ext = u.kind === "video" ? "mp4" : "jpg";
  const guest = (u.guest_name || "photo").replace(/[^a-zA-Z0-9-]/g, "_");
  return `${guest}-${u.id.slice(0, 8)}.${ext}`;
}

function firstEmoji(label: string): string {
  const m = label.match(/\p{Extended_Pictographic}/u);
  return m ? m[0] : "🎲";
}
