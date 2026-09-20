"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function GuestbookToggle({
  eventId,
  initial,
}: {
  eventId: string;
  initial: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !active;
    setSaving(true);
    setActive(next); // optimiste
    const supabase = createClient();
    const { error } = await supabase.from("events").update({ guestbook_active: next }).eq("id", eventId);
    setSaving(false);
    if (error) {
      setActive(!next); // rollback
      alert("Impossible de mettre à jour : " + error.message);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="card flex items-center justify-between p-5">
      <div>
        <div className="eyebrow mb-1">Livre d&apos;or</div>
        <div className="text-[15px] font-semibold">{active ? "Ouvert aux invités" : "En pause"}</div>
        <div className="mt-0.5 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
          {active ? "Les invités peuvent signer leur page." : "Active-le quand tu es prêt·e à le partager."}
        </div>
      </div>
      <button
        role="switch"
        aria-checked={active}
        aria-label="Activer le livre d'or"
        onClick={toggle}
        disabled={saving}
        className="relative h-8 w-[56px] flex-none rounded-full transition"
        style={{ background: active ? "var(--sage)" : "var(--line-strong)" }}
      >
        <span className="absolute top-1 h-6 w-6 rounded-full bg-white transition-all" style={{ left: active ? "28px" : "4px" }} />
      </button>
    </div>
  );
}
