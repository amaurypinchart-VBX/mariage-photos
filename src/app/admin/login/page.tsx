"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setError("E-mail ou mot de passe incorrect.");
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
      <p className="mt-2 text-[15px]" style={{ color: "var(--ink-soft)" }}>
        Connecte-toi avec l&apos;e-mail et le mot de passe créés dans Supabase.
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder="ton.email@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input"
        />
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Connexion…" : "Me connecter"}
        </button>
        {error && (
          <p className="text-[13px]" style={{ color: "#c0522d" }}>
            {error}
          </p>
        )}
      </form>

      <p className="mt-5 text-[12.5px]" style={{ color: "var(--ink-faint)" }}>
        Les comptes organisateurs se créent dans Supabase → Authentication → Users
        → « Add user » (avec « Auto Confirm User »).
      </p>
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
