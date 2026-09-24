"use client";

import { useState } from "react";

const IBAN = "BE24950268273538";

export default function DonationNote() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(IBAN);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignoré */
    }
  }

  return (
    <div className="card mb-6 p-4" style={{ background: "var(--champ-tint)" }}>
      <p className="text-[14px]" style={{ color: "var(--ink)" }}>
        🎁 Si le cœur vous en dit, vous pouvez participer à notre voyage avec
        un petit don — entièrement libre, sans aucune obligation !
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="rounded-field border px-3 py-2 text-[13.5px] font-semibold tracking-wide"
          style={{ borderColor: "var(--line-strong)", background: "var(--surface-2)", color: "var(--ink)" }}
        >
          {IBAN}
        </span>
        <button type="button" onClick={copy} className="chip" style={{ cursor: "pointer" }}>
          {copied ? "✓ Copié" : "🔗 Copier l'IBAN"}
        </button>
      </div>
    </div>
  );
}
