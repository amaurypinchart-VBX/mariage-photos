"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DestinationOption } from "@/lib/types";

export type DestinationTally = { option: DestinationOption; count: number };

export default function DestinationPollManager({ initial }: { initial: DestinationTally[] }) {
  const [tallies, setTallies] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(optionId: string) {
    if (!confirm("Supprimer cette destination et ses votes ?")) return;
    setDeleting(optionId);
    const supabase = createClient();
    const { error } = await supabase.from("destination_options").delete().eq("id", optionId);
    setDeleting(null);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setTallies((prev) => prev.filter((t) => t.option.id !== optionId));
  }

  if (tallies.length === 0) {
    return (
      <div className="card p-6 text-center text-[13px]" style={{ color: "var(--ink-soft)" }}>
        Aucune destination proposée pour l&apos;instant.
      </div>
    );
  }

  const sorted = [...tallies].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...sorted.map((t) => t.count));

  return (
    <div className="flex flex-col gap-2">
      {sorted.map(({ option, count }) => (
        <div key={option.id} className="card p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{option.label}</span>
            <div className="flex items-center gap-2">
              <span className="chip">
                {count} vote{count > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => remove(option.id)}
                disabled={deleting === option.id}
                className="text-[13px] font-semibold"
                style={{ color: "#c0522d", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${(count / maxCount) * 100}%`, background: "var(--sage)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
