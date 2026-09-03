"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Étape 1 : envoyer le code à 6 chiffres par e-mail.
  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  // Étape 2 : vérifier le code et ouvrir la session.
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (token.length < 6) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    setBusy(false);
    if (error) {
      setError("Code incorrect ou expiré. Renvoie un nouveau code.");
    } else {
      router.push(next);
      router.refresh();
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

      {step === "email" ? (
        <>
          <p className="mt-2 text-[15px]" style={{ color: "var(--ink-soft)" }}>
            Entre ton e-mail : tu recevras un <b>code à 6 chiffres</b> à recopier ici.
          </p>
          <form onSubmit={sendCode} className="mt-6 flex flex-col gap-3">
            <input
              type="email"
              required
              autoFocus
              placeholder="ton.email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input"
            />
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Envoi…" : "Recevoir mon code"}
            </button>
            {error && (
              <p className="text-[13px]" style={{ color: "#c0522d" }}>
                {error}
              </p>
            )}
          </form>
        </>
      ) : (
        <>
          <p className="mt-2 text-[15px]" style={{ color: "var(--ink-soft)" }}>
            Un code a été envoyé à <b>{email}</b>. Saisis-le ci-dessous (regarde aussi tes spams).
          </p>
          <form onSubmit={verify} className="mt-6 flex flex-col gap-3">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              className="field-input text-center"
              style={{ letterSpacing: "0.4em", fontSize: "24px", fontWeight: 600 }}
            />
            <button className="btn btn-primary" disabled={busy || code.length < 6}>
              {busy ? "Vérification…" : "Me connecter"}
            </button>
            {error && (
              <p className="text-[13px]" style={{ color: "#c0522d" }}>
                {error}
              </p>
            )}
          </form>
          <div className="mt-4 flex items-center justify-between text-[13px]">
            <button onClick={() => { setStep("email"); setCode(""); setError(""); }} style={{ color: "var(--ink-soft)" }}>
              ‹ Changer d&apos;e-mail
            </button>
            <button onClick={(e) => sendCode(e as unknown as React.FormEvent)} style={{ color: "var(--sage)" }}>
              Renvoyer un code
            </button>
          </div>
        </>
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
