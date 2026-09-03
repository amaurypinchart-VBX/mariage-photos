"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PhotoChallenge } from "@/lib/types";

export default function ChallengesManager({
  eventId,
  initial,
}: {
  eventId: string;
  slug: string;
  initial: PhotoChallenge[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<PhotoChallenge[]>(initial);
  const [label, setLabel] = useState("");
  const [threshold, setThreshold] = useState(0);
  const [busy, setBusy] = useState(false);

  async function toggleActive(c: PhotoChallenge) {
    const supabase = createClient();
    setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !x.is_active } : x)));
    await supabase.from("photo_challenges").update({ is_active: !c.is_active }).eq("id", c.id);
    router.refresh();
  }

  async function remove(c: PhotoChallenge) {
    if (!confirm("Supprimer ce défi ?")) return;
    const supabase = createClient();
    setItems((prev) => prev.filter((x) => x.id !== c.id));
    await supabase.from("photo_challenges").delete().eq("id", c.id);
    router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const sort = (items.reduce((m, x) => Math.max(m, x.sort_order), 0) || 0) + 1;
    const { data, error } = await supabase
      .from("photo_challenges")
      .insert({
        event_id: eventId,
        label: label.trim(),
        sort_order: sort,
        unlock_threshold: threshold,
        is_active: true,
      })
      .select("id, event_id, label, sort_order, unlock_threshold, is_active")
      .single();
    setBusy(false);
    if (!error && data) {
      setItems((prev) => [...prev, data as PhotoChallenge]);
      setLabel("");
      setThreshold(0);
      router.refresh();
    } else if (error) {
      alert("Erreur : " + error.message);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex flex-col divide-y" style={{ borderColor: "var(--line)" }}>
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-3 py-2.5">
            <span className="text-[14px]" style={{ opacity: c.is_active ? 1 : 0.45 }}>
              {c.label}
              {c.unlock_threshold > 0 && (
                <span className="ml-1.5 text-[11.5px]" style={{ color: "var(--champ)" }}>
                  · bonus après {c.unlock_threshold}
                </span>
              )}
            </span>
            <div className="ml-auto flex flex-none items-center gap-2">
              <button
                onClick={() => toggleActive(c)}
                className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                style={{
                  background: c.is_active ? "var(--sage-tint)" : "var(--surface)",
                  color: c.is_active ? "var(--sage)" : "var(--ink-faint)",
                }}
              >
                {c.is_active ? "Actif" : "Inactif"}
              </button>
              <button onClick={() => remove(c)} className="text-[13px]" style={{ color: "var(--ink-faint)" }} title="Supprimer">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <input
          className="field-input flex-1"
          style={{ minWidth: "180px" }}
          placeholder="Nouveau défi (avec emoji au début, ex. 🎉 …)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
          débloqué après
          <input
            type="number"
            min={0}
            className="field-input w-[68px]"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value || "0", 10))}
          />
        </label>
        <button className="btn btn-primary" disabled={busy} style={{ padding: "12px 18px" }}>
          Ajouter
        </button>
      </form>
    </div>
  );
}
