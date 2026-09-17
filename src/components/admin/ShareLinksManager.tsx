"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ShareLink } from "@/lib/types";

export default function ShareLinksManager({
  eventId,
  slug,
  siteUrl,
  initial,
}: {
  eventId: string;
  slug: string;
  siteUrl: string;
  initial: ShareLink[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<ShareLink[]>(initial);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function urlFor(link: ShareLink) {
    return `${siteUrl}/e/${slug}/album/${link.token}`;
  }

  async function copy(link: ShareLink) {
    try {
      await navigator.clipboard.writeText(urlFor(link));
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* ignoré */
    }
  }

  async function toggleActive(link: ShareLink) {
    const supabase = createClient();
    setItems((prev) => prev.map((x) => (x.id === link.id ? { ...x, is_active: !x.is_active } : x)));
    await supabase.from("share_links").update({ is_active: !link.is_active }).eq("id", link.id);
    router.refresh();
  }

  async function remove(link: ShareLink) {
    if (!confirm(`Supprimer le lien « ${link.label} » ? Il ne fonctionnera plus.`)) return;
    const supabase = createClient();
    setItems((prev) => prev.filter((x) => x.id !== link.id));
    await supabase.from("share_links").delete().eq("id", link.id);
    router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const { data, error } = await supabase
      .from("share_links")
      .insert({ event_id: eventId, label: label.trim(), token, is_active: true })
      .select("id, event_id, label, token, is_active, created_at")
      .single();
    setBusy(false);
    if (!error && data) {
      setItems((prev) => [...prev, data as ShareLink]);
      setLabel("");
      router.refresh();
    } else if (error) {
      alert("Erreur : " + error.message);
    }
  }

  return (
    <div className="card p-4">
      {items.length === 0 ? (
        <p className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
          Aucun lien pour l&apos;instant. Crée-en un pour partager une sélection de
          photos avec la famille, les amis, etc.
        </p>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--line)" }}>
          {items.map((link) => (
            <div key={link.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <span className="text-[14px] font-semibold" style={{ opacity: link.is_active ? 1 : 0.45 }}>
                {link.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: "var(--ink-faint)" }}>
                {urlFor(link)}
              </span>
              <div className="ml-auto flex flex-none items-center gap-2">
                <button onClick={() => copy(link)} className="chip" style={{ cursor: "pointer" }}>
                  {copiedId === link.id ? "✓ Copié" : "🔗 Copier"}
                </button>
                <button
                  onClick={() => toggleActive(link)}
                  className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                  style={{
                    background: link.is_active ? "var(--sage-tint)" : "var(--surface)",
                    color: link.is_active ? "var(--sage)" : "var(--ink-faint)",
                  }}
                >
                  {link.is_active ? "Actif" : "Inactif"}
                </button>
                <button onClick={() => remove(link)} className="text-[13px]" style={{ color: "var(--ink-faint)" }} title="Supprimer">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <input
          className="field-input flex-1"
          style={{ minWidth: "180px" }}
          placeholder="Nom du lien, ex. Famille, Amis, Tout…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button className="btn btn-primary" disabled={busy} style={{ padding: "12px 18px" }}>
          Créer le lien
        </button>
      </form>
    </div>
  );
}
