"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { WeddingEvent } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";

const EVENT_COLS =
  "id, slug, couple_names, event_date, place, welcome_message, color_primary, color_accent, game_active, gallery_public, guestbook_active, is_active, created_at";

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // data
  const [events, setEvents] = useState<WeddingEvent[] | null>(null);

  // --- session ---
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- load the events this admin manages ---
  const loadEvents = useCallback(async () => {
    const supabase = createClient();
    const { data: memberships } = await supabase.from("event_admins").select("event_id");
    const ids = (memberships ?? []).map((m) => m.event_id as string);
    if (ids.length === 0) {
      setEvents([]);
      return;
    }
    const { data } = await supabase
      .from("events")
      .select(EVENT_COLS)
      .in("id", ids)
      .order("created_at", { ascending: false });
    setEvents((data as WeddingEvent[]) ?? []);
  }, []);

  useEffect(() => {
    if (userEmail) loadEvents();
    else setEvents(null);
  }, [userEmail, loadEvents]);

  async function signIn(e: React.FormEvent) {
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
    if (error) setError("E-mail ou mot de passe incorrect.");
    // en cas de succès, onAuthStateChange met à jour l'affichage (aucune redirection)
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  // ===================== RENDU =====================

  const Header = ({ right }: { right?: React.ReactNode }) => (
    <div className="mb-7 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-[9px] w-[9px] rounded-full" style={{ background: "var(--champ)" }} />
        <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.34em", color: "var(--ink-soft)" }}>
          Éclats · Admin
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {right}
      </div>
    </div>
  );

  if (!ready) {
    return (
      <div className="mx-auto mt-24 max-w-[420px] text-center" style={{ color: "var(--ink-soft)" }}>
        Chargement…
      </div>
    );
  }

  // --- non connecté : formulaire (aucune redirection) ---
  if (!userEmail) {
    return (
      <div className="mx-auto mt-10 max-w-[420px]">
        <Header />
        <h1 className="display text-[32px] leading-tight">Espace organisateurs</h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--ink-soft)" }}>
          Connecte-toi avec l&apos;e-mail et le mot de passe créés dans Supabase.
        </p>
        <form onSubmit={signIn} className="mt-6 flex flex-col gap-3">
          <input type="email" required autoFocus autoComplete="email" placeholder="ton.email@exemple.com"
            value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
          <input type="password" required autoComplete="current-password" placeholder="Mot de passe"
            value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Connexion…" : "Me connecter"}
          </button>
          {error && <p className="text-[13px]" style={{ color: "#c0522d" }}>{error}</p>}
        </form>
      </div>
    );
  }

  // --- connecté : liste des mariages ---
  return (
    <div>
      <Header right={<button onClick={signOut} className="rounded-full border px-3 py-1.5 text-[13px] font-semibold" style={{ borderColor: "var(--line-strong)", color: "var(--ink-soft)" }}>Déconnexion</button>} />
      <h1 className="display text-[34px] leading-tight">Vos mariages</h1>
      <p className="mt-1 text-[14px]" style={{ color: "var(--ink-soft)" }}>Connecté en tant que {userEmail}</p>

      {events === null ? (
        <p className="mt-6" style={{ color: "var(--ink-soft)" }}>Chargement…</p>
      ) : events.length === 0 ? (
        <div className="card mt-6 p-6">
          <p className="font-semibold">Aucun mariage lié à ce compte.</p>
          <p className="mt-2 text-[14px]" style={{ color: "var(--ink-soft)" }}>
            Relie ton compte dans Supabase (SQL Editor) avec la requête « event_admins », puis recharge cette page.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {events.map((e) => (
            <Link key={e.id} href={`/admin/${e.slug}`} className="card block p-5 text-left transition hover:shadow-soft">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{e.is_active ? "Ouvert" : "Fermé"}</span>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: e.game_active ? "var(--sage-tint)" : "var(--surface)", color: e.game_active ? "var(--sage)" : "var(--ink-faint)" }}>
                  {e.game_active ? "🎲 Jeu actif" : "Jeu en pause"}
                </span>
              </div>
              <div className="display mt-3 text-[24px]">{e.couple_names}</div>
              <div className="mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>/e/{e.slug}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
