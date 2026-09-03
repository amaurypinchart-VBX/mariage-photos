"use client";

import { useMemo, useState } from "react";
import type { GuestUpload, PhotoChallenge } from "@/lib/types";

export default function AdminGallery({
  uploads,
  urlByPath,
  challenges,
}: {
  uploads: GuestUpload[];
  urlByPath: Record<string, string>;
  challenges: PhotoChallenge[];
}) {
  const challengeLabel = useMemo(() => {
    const m: Record<string, string> = {};
    challenges.forEach((c) => (m[c.id] = c.label));
    return m;
  }, [challenges]);

  const guests = useMemo(() => {
    const s = new Set<string>();
    uploads.forEach((u) => {
      const n = (u.guest_name || "").trim();
      if (n) s.add(n);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "fr"));
  }, [uploads]);

  const [guestFilter, setGuestFilter] = useState("");
  const [challengeFilter, setChallengeFilter] = useState("");

  const filtered = uploads.filter((u) => {
    if (guestFilter && (u.guest_name || "").trim() !== guestFilter) return false;
    if (challengeFilter === "__none__" && u.challenge_id) return false;
    if (challengeFilter && challengeFilter !== "__none__" && u.challenge_id !== challengeFilter)
      return false;
    return true;
  });

  if (uploads.length === 0) {
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
          <option value="__none__">Hors défi (photos libres)</option>
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label.length > 42 ? c.label.slice(0, 42) + "…" : c.label}
            </option>
          ))}
        </select>
        <span className="chip" style={{ marginLeft: "auto" }}>
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((u) => {
          const url = urlByPath[u.storage_path];
          return (
            <div key={u.id} className="card overflow-hidden">
              <div className="relative" style={{ aspectRatio: "1", background: "var(--surface)" }}>
                {url ? (
                  u.kind === "video" ? (
                    <video src={url} controls playsInline className="h-full w-full object-cover" />
                  ) : (
                    <a href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </a>
                  )
                ) : (
                  <div className="grid h-full place-items-center text-[12px]" style={{ color: "var(--ink-faint)" }}>
                    aperçu indisponible
                  </div>
                )}
                {u.challenge_id && challengeLabel[u.challenge_id] && (
                  <span className="absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[15px]" title={challengeLabel[u.challenge_id]} style={{ background: "rgba(0,0,0,.5)" }}>
                    {firstEmoji(challengeLabel[u.challenge_id])}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                <span className="truncate text-[12.5px] font-medium">
                  {u.guest_name || "Anonyme"}
                </span>
                {url && (
                  <a href={url} download target="_blank" rel="noreferrer" className="flex-none text-[13px]" style={{ color: "var(--sage)" }} title="Ouvrir / télécharger">
                    ⬇
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function firstEmoji(label: string): string {
  const m = label.match(/\p{Extended_Pictographic}/u);
  return m ? m[0] : "🎲";
}
