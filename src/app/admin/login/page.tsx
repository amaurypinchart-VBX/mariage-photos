"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/env";
import ThemeToggle from "@/components/ThemeToggle";

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setState("error");
      setMsg(error.message);
    } else {
      setState("sent");
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-[420px]">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-[9px] w-[9px] rounded-full" style={{ background: "var(--champ)" }} />
          <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.34em", color: "var(--ink-soft)" }}>
            Éclats · Admin
          </span>
        </div>
        <ThemeToggle />
      </div>

      <h1 className="display text-[32px] leading-tight">Espace organisateurs</h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--ink-soft)" }}>
        Entre ton e-mail : tu recevras un lien de connexion sécurisé, sans mot de passe.
      </p>

      {state === "sent" ? (
        <div className="card mt-6 p-5 text-[15px]">
          <p className="font-semibold">Vérifie ta boîte mail ✉️</p>
          <p className="mt-1" style={{ color: "var(--ink-soft)" }}>
            Un lien de connexion a été envoyé à <b>{email}</b>. Ouvre-le sur cet appareil.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="ton.email@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
          <button className="btn btn-primary" disabled={state === "sending"}>
            {state === "sending" ? "Envoi…" : "Recevoir mon lien de connexion"}
          </button>
          {state === "error" && (
            <p className="text-[13px]" style={{ color: "#c0522d" }}>
              {msg}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
