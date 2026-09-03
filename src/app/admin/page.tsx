"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GuestUpload, PhotoChallenge, WeddingEvent } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
import QrCard from "@/components/admin/QrCard";
import GameToggle from "@/components/admin/GameToggle";
import AdminGallery from "@/components/admin/AdminGallery";
import ChallengesManager from "@/components/admin/ChallengesManager";

const EVENT_COLS =
  "id, slug, couple_names, event_date, place, welcome_message, color_primary, color_accent, game_active, gallery_public, is_active, created_at";

type Detail = {
  uploads: GuestUpload[];
  urlByPath: Record<string, string>;
  challenges: PhotoChallenge[];
};

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
  const [selected, setSelected] = useState<WeddingEvent | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  // --- session ---
  useEffect(() => {
    setBaseUrl(window.location.origin);
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
    else {
      setEvents(null);
      setSelected(null);
      setDetail(null);
    }
  }, [userEmail, loadEvents]);

  // --- open one wedding ---
  async function openEvent(ev: WeddingEvent) {
    setSelected(ev);
    setDetail(null);
    const supabase = createClient();
    const [{ data: up }, { data: ch }] = await Promise.all([
      supabase
        .from("guest_uploads")
        .select("id, event_id, guest_name, storage_path, kind, mime_type, size_bytes, challenge_id, created_at")
        .eq("event_id", ev.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("photo_challenges")
        .select("id, event_id, label, sort_order, unlock_threshold, is_active")
        .eq("event_id", ev.id)
        .order("sort_order", { ascending: true }),
    ]);
    const uploads = (up as GuestUpload[]) ?? [];
    const challenges = (ch as PhotoChallenge[]) ?? [];
    const urlByPath: Record<string, string> = {};
    if (uploads.length > 0) {
      const { data: signed } = await supabase.storage
        .from("wedding-media")
        .createSignedUrls(uploads.map((u) => u.storage_path), 60 * 60 * 2);
      (signed ?? []).forEach((s) => {
        if (s.signedUrl && s.path) urlByPath[s.path] = s.signedUrl;
      });
    }
    setDetail({ uploads, urlByPath, challenges });
  }

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
    setSelected(null);
    setDetail(null);
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

  // --- connecté : détail d'un mariage ---
  if (selected) {
    const guestUrl = `${baseUrl}/e/${selected.slug}`;
    const uploads = detail?.uploads ?? [];
    const photos = uploads.filter((u) => u.kind === "image").length;
    const videos = uploads.filter((u) => u.kind === "video").length;
    const contributors = new Set(
      uploads.map((u) => (u.guest_name || "").trim().toLowerCase()).filter(Boolean)
    ).size;
    return (
      <div>
        <Header right={<button onClick={signOut} className="rounded-full border px-3 py-1.5 text-[13px] font-semibold" style={{ borderColor: "var(--line-strong)", color: "var(--ink-soft)" }}>Déconnexion</button>} />
        <button onClick={() => { setSelected(null); setDetail(null); }} className="mb-4 text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
          ‹ Tous les mariages
        </button>
        <div className="eyebrow mb-1.5">Espace organisateurs</div>
        <h1 className="display text-[34px] leading-tight">{selected.couple_names}</h1>
        <a href={guestUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[13px]" style={{ color: "var(--sage)" }}>
          {guestUrl} ↗
        </a>

        {!detail ? (
          <p className="mt-6" style={{ color: "var(--ink-soft)" }}>Chargement des photos…</p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat value={photos} label={photos > 1 ? "photos" : "photo"} />
              <Stat value={videos} label={videos > 1 ? "vidéos" : "vidéo"} />
              <Stat value={contributors} label={contributors > 1 ? "invités" : "invité"} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <GameToggle eventId={selected.id} slug={selected.slug} initial={selected.game_active} />
              <QrCard url={guestUrl} coupleNames={selected.couple_names} />
            </div>
            <h2 className="display mt-9 text-[24px]">Galerie</h2>
            <p className="mb-3 mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
              Toutes les photos déposées par vos invités. Filtre par invité ou par défi, télécharge à l&apos;unité.
            </p>
            <AdminGallery uploads={detail.uploads} urlByPath={detail.urlByPath} challenges={detail.challenges} />
            <h2 className="display mt-10 text-[24px]">Défis de la roulette</h2>
            <p className="mb-3 mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
              Active, désactive ou ajoute des défis (« débloqué après » = défi bonus, 0 = disponible tout de suite).
            </p>
            <ChallengesManager eventId={selected.id} slug={selected.slug} initial={detail.challenges} />
          </>
        )}
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
            <button key={e.id} onClick={() => openEvent(e)} className="card block p-5 text-left transition hover:shadow-soft">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{e.is_active ? "Ouvert" : "Fermé"}</span>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: e.game_active ? "var(--sage-tint)" : "var(--surface)", color: e.game_active ? "var(--sage)" : "var(--ink-faint)" }}>
                  {e.game_active ? "🎲 Jeu actif" : "Jeu en pause"}
                </span>
              </div>
              <div className="display mt-3 text-[24px]">{e.couple_names}</div>
              <div className="mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>/e/{e.slug}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="display text-[30px] leading-none">{value}</div>
      <div className="mt-1 text-[12px]" style={{ color: "var(--ink-soft)" }}>{label}</div>
    </div>
  );
}
