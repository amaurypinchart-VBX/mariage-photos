"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { castDestinationVote } from "@/app/e/[slug]/livre-dor/actions";
import type { DestinationOption, DestinationVote } from "@/lib/types";

type Tally = { option: DestinationOption; count: number };

export default function DestinationPoll({
  eventId,
  slug,
  guestId,
}: {
  eventId: string;
  slug: string;
  guestId: string;
}) {
  const [options, setOptions] = useState<DestinationOption[]>([]);
  const [votes, setVotes] = useState<DestinationVote[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [{ data: optionsData }, { data: votesData }] = await Promise.all([
      supabase
        .from("destination_options")
        .select("id, event_id, label, label_key, created_by, created_at")
        .eq("event_id", eventId),
      supabase.from("destination_votes").select("id, event_id, option_id, guest_id, created_at").eq("event_id", eventId),
    ]);
    setOptions((optionsData as DestinationOption[]) ?? []);
    setVotes((votesData as DestinationVote[]) ?? []);
  }, [eventId]);

  useEffect(() => {
    refresh();
    const supabase = createClient();
    const channel = supabase
      .channel(`destinations-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "destination_options", filter: `event_id=eq.${eventId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "destination_votes", filter: `event_id=eq.${eventId}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, refresh]);

  const myVote = votes.find((v) => v.guest_id === guestId);

  const tallies: Tally[] = options
    .map((option) => ({ option, count: votes.filter((v) => v.option_id === option.id).length }))
    .sort((a, b) => b.count - a.count || a.option.label.localeCompare(b.option.label, "fr"));

  async function vote(optionId: string) {
    setBusy(true);
    setError(null);
    const result = await castDestinationVote(slug, guestId, { optionId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refresh();
  }

  async function addAndVote(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    setBusy(true);
    setError(null);
    const result = await castDestinationVote(slug, guestId, { newLabel: label });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewLabel("");
    refresh();
  }

  return (
    <div className="mt-6">
      <h3 className="text-[14px] font-semibold">✈️ Vote : notre prochaine destination</h3>
      <p className="mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
        Propose une destination de voyage ou vote pour celle des autres. Mis à jour en direct !
      </p>

      {tallies.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {tallies.map(({ option, count }) => {
            const mine = myVote?.option_id === option.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => vote(option.id)}
                  disabled={busy}
                  className="flex w-full items-center justify-between rounded-field border px-3 py-2.5 text-left text-[14px]"
                  style={{
                    borderColor: mine ? "var(--sage)" : "var(--line)",
                    background: mine ? "var(--sage-tint)" : "var(--surface)",
                  }}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="chip">
                    {count} vote{count > 1 ? "s" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={addAndVote} className="mt-3 flex gap-2">
        <input
          type="text"
          placeholder="Proposer une destination…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="field-input flex-1"
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !newLabel.trim()} style={{ padding: "0 16px" }}>
          + Ajouter
        </button>
      </form>

      {error && (
        <p className="mt-2 text-[13px]" style={{ color: "#c0522d" }}>
          {error}
        </p>
      )}
    </div>
  );
}
