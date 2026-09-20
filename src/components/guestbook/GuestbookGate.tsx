"use client";

import { useRef, useState } from "react";
import { loginOrRegisterGuest } from "@/app/e/[slug]/livre-dor/actions";

export default function GuestbookGate({
  slug,
  onLoggedIn,
}: {
  slug: string;
  onLoggedIn: (guestId: string) => void;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Indique ton prénom.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("Le code doit contenir 4 chiffres.");
      pinRef.current?.focus();
      return;
    }
    setLoading(true);
    const result = await loginOrRegisterGuest(slug, name, pin);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onLoggedIn(result.data.guestId);
  }

  return (
    <form onSubmit={submit} className="mt-[18px]">
      <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>
        Écris ton prénom et choisis un code à 4 chiffres pour retrouver ta page
        plus tard, depuis n&apos;importe quel appareil.
      </p>

      <div className="mt-[18px]">
        <label htmlFor="gb-name" className="mb-[7px] ml-[3px] block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
          Ton prénom
        </label>
        <input
          id="gb-name"
          type="text"
          autoComplete="given-name"
          placeholder="Ex. Camille"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field-input"
        />
      </div>

      <div className="mt-[14px]">
        <label htmlFor="gb-pin" className="mb-[7px] ml-[3px] block text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
          Ton code à 4 chiffres
        </label>
        <input
          id="gb-pin"
          ref={pinRef}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="field-input text-center tracking-[0.4em]"
        />
        <p className="mt-1.5 ml-[3px] text-[12px]" style={{ color: "var(--ink-faint)" }}>
          Première visite ? Ce code sera créé pour toi. Déjà venu ? Retape le même.
        </p>
      </div>

      {error && (
        <p className="mt-3 text-[13px] font-semibold" style={{ color: "#c0522d" }}>
          {error}
        </p>
      )}

      <button className="btn btn-primary mt-[18px] w-full" disabled={loading}>
        {loading ? "Un instant…" : <><span className="text-[18px]">💌</span> Ouvrir ma page</>}
      </button>
    </form>
  );
}
