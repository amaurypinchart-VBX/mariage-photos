"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGuestName } from "@/lib/useGuestName";

// Champ prénom + boutons d'action de l'écran d'accueil invité.
export default function NameGate({
  slug,
  gameActive,
}: {
  slug: string;
  gameActive: boolean;
}) {
  const router = useRouter();
  const { name, save } = useGuestName(slug);
  const [value, setValue] = useState("");
  const [warn, setWarn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (name) setValue(name);
  }, [name]);

  function go(dest: "partager" | "jeu") {
    const v = value.trim();
    if (!v) {
      setWarn(true);
      inputRef.current?.focus();
      setTimeout(() => setWarn(false), 1200);
      return;
    }
    save(v);
    router.push(`/e/${slug}/${dest}`);
  }

  return (
    <>
      <div className="mt-[18px]">
        <label
          htmlFor="firstname"
          className="mb-[7px] ml-[3px] block text-xs font-semibold"
          style={{ color: "var(--ink-soft)" }}
        >
          Ton prénom
        </label>
        <input
          id="firstname"
          ref={inputRef}
          type="text"
          autoComplete="given-name"
          placeholder="Ex. Camille"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="field-input"
          style={warn ? { borderColor: "var(--champ)" } : undefined}
        />
      </div>

      <div className="mt-[18px] flex flex-col gap-[11px]">
        <button className="btn btn-primary" onClick={() => go("partager")}>
          <span className="text-[18px]">✦</span> Partager mes photos
        </button>
        {gameActive && (
          <button className="btn btn-ghost" onClick={() => go("jeu")}>
            <span className="text-[18px]">✲</span> La roulette photo
          </button>
        )}
      </div>
    </>
  );
}
