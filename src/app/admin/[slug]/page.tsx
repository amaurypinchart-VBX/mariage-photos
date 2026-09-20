import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import type { GuestUpload, PhotoChallenge, ShareLink, WeddingEvent } from "@/lib/types";
import { getGuestbookPages, getGuestbookCover, getDestinationTallies } from "@/lib/guestbookAdmin";
import ThemeToggle from "@/components/ThemeToggle";
import SignOutButton from "@/components/admin/SignOutButton";
import GameToggle from "@/components/admin/GameToggle";
import QrCard from "@/components/admin/QrCard";
import AdminGallery from "@/components/admin/AdminGallery";
import ChallengesManager from "@/components/admin/ChallengesManager";
import ShareLinksManager from "@/components/admin/ShareLinksManager";
import GuestbookToggle from "@/components/admin/GuestbookToggle";
import GuestbookCoverEditor from "@/components/admin/GuestbookCoverEditor";
import GuestbookManager from "@/components/admin/GuestbookManager";
import DestinationPollManager from "@/components/admin/DestinationPollManager";

export const dynamic = "force-dynamic";

export default async function AdminEventPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: eventData } = await supabase
    .from("events")
    .select(
      "id, slug, couple_names, event_date, place, welcome_message, color_primary, color_accent, game_active, gallery_public, guestbook_active, guestbook_cover_title, guestbook_cover_message, guestbook_cover_stickers, is_active, created_at"
    )
    .eq("slug", params.slug)
    .maybeSingle();
  if (!eventData) notFound();
  const event = eventData as WeddingEvent;

  const [
    { data: uploadsData, error: uploadsError },
    { data: challengesData, error: challengesError },
    { data: shareLinksData, error: shareLinksError },
  ] = await Promise.all([
    supabase
      .from("guest_uploads")
      .select(
        "id, event_id, guest_name, storage_path, kind, mime_type, size_bytes, challenge_id, share_link_id, visible_to_all, created_at"
      )
      .eq("event_id", event.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("photo_challenges")
      .select("id, event_id, label, sort_order, unlock_threshold, is_active")
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("share_links")
      .select("id, event_id, label, token, is_active, created_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true }),
  ]);

  // Une requête en erreur (ex. colonne/table manquante après une restauration
  // de base) ne doit jamais se faire passer pour "0 photo" : on le signale.
  const loadError = uploadsError?.message || challengesError?.message || shareLinksError?.message || null;
  const uploads = (uploadsData as GuestUpload[]) ?? [];
  const challenges = (challengesData as PhotoChallenge[]) ?? [];
  const shareLinks = (shareLinksData as ShareLink[]) ?? [];

  // Livre d'or : invités, pages, couverture et médias associés (partagé avec /livre-dor).
  const [guestPages, cover, destinationTallies] = await Promise.all([
    getGuestbookPages(supabase, event.id),
    getGuestbookCover(supabase, event),
    getDestinationTallies(supabase, event.id),
  ]);

  // URLs signées (temporaires, 2h) pour visualiser/télécharger les médias privés.
  const urlByPath: Record<string, string> = {};
  if (uploads.length > 0) {
    const { data: signed } = await supabase.storage
      .from("wedding-media")
      .createSignedUrls(
        uploads.map((u) => u.storage_path),
        60 * 60 * 2
      );
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && s.path) urlByPath[s.path] = s.signedUrl;
    });
  }

  const guestUrl = `${SITE_URL}/e/${event.slug}`;
  const contributors = new Set(
    uploads.map((u) => (u.guest_name || "").trim().toLowerCase()).filter(Boolean)
  ).size;
  const photos = uploads.filter((u) => u.kind === "image").length;
  const videos = uploads.filter((u) => u.kind === "video").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin" className="text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
          ‹ Tous les mariages
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1.5">Espace organisateurs</div>
          <h1 className="display text-[34px] leading-tight">{event.couple_names}</h1>
          <Link href={guestUrl} className="mt-1 inline-block text-[13px]" style={{ color: "var(--sage)" }}>
            {guestUrl} ↗
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="card mt-5 p-6" style={{ borderColor: "#c0522d" }}>
          <p className="font-semibold" style={{ color: "#c0522d" }}>
            Erreur de chargement des données
          </p>
          <p className="mt-2 text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
            {loadError}
          </p>
          <p className="mt-3 text-[13px]" style={{ color: "var(--ink-soft)" }}>
            Ceci ne veut pas dire que tes photos ont été supprimées — la requête a
            échoué (souvent parce que le schéma de la base n&apos;est pas à jour).
            Recolle <code>supabase/schema.sql</code> dans le SQL Editor Supabase,
            puis recharge cette page.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat value={photos} label={photos > 1 ? "photos" : "photo"} />
        <Stat value={videos} label={videos > 1 ? "vidéos" : "vidéo"} />
        <Stat value={contributors} label={contributors > 1 ? "invités" : "invité"} />
      </div>

      {/* Réglages : jeu + QR */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <GameToggle eventId={event.id} initial={event.game_active} slug={event.slug} />
        <QrCard url={guestUrl} coupleNames={event.couple_names} />
      </div>

      {/* Livre d'or */}
      <div className="mt-9 flex flex-wrap items-end justify-between gap-3">
        <h2 className="display text-[24px]">Livre d&apos;or</h2>
        <Link href={`/admin/${event.slug}/livre-dor`} className="text-[13px] font-semibold" style={{ color: "var(--sage)" }}>
          📖 Voir le livre d&apos;or en grand ↗
        </Link>
      </div>
      <p className="mb-3 mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
        Chaque invité crée sa propre page (message, stickers, photos, vidéo,
        message vocal). Le lien est affiché à vos invités dès que c&apos;est activé.
      </p>
      <GuestbookToggle eventId={event.id} initial={event.guestbook_active} />
      <div className="mt-4">
        <GuestbookCoverEditor
          eventId={event.id}
          initialTitle={cover.title}
          initialMessage={cover.message}
          initialStickers={cover.stickers}
          initialPhotos={cover.photos}
        />
      </div>
      <div className="mt-4">
        <GuestbookManager initial={guestPages} />
      </div>

      {/* Vote destination */}
      <h2 className="display mt-9 text-[24px]">Vote destination de lune de miel</h2>
      <p className="mb-3 mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
        Les destinations proposées et votées par vos invités depuis le livre d&apos;or.
      </p>
      <DestinationPollManager initial={destinationTallies} />

      {/* Liens de partage */}
      <h2 className="display mt-9 text-[24px]">Liens de partage</h2>
      <p className="mb-3 mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
        Crée un lien par public (famille, amis, tout le monde…). Choisis ensuite,
        photo par photo dans la galerie ci-dessous, à qui chacune est partagée.
      </p>
      <ShareLinksManager eventId={event.id} slug={event.slug} siteUrl={SITE_URL} initial={shareLinks} />

      {/* Galerie */}
      <h2 className="display mt-9 text-[24px]">Galerie</h2>
      <p className="mb-3 mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
        Toutes les photos déposées par vos invités. Filtre par invité ou par défi,
        sélectionne-en plusieurs pour les partager ou les télécharger d&apos;un coup.
      </p>
      <AdminGallery uploads={uploads} urlByPath={urlByPath} challenges={challenges} shareLinks={shareLinks} />

      {/* Défis */}
      <h2 className="display mt-10 text-[24px]">Défis de la roulette</h2>
      <p className="mb-3 mt-1 text-[13px]" style={{ color: "var(--ink-soft)" }}>
        Active, désactive ou ajoute des défis. Le champ « débloqué après » sert au
        défi bonus (0 = disponible tout de suite).
      </p>
      <ChallengesManager eventId={event.id} slug={event.slug} initial={challenges} />
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="display text-[30px] leading-none">{value}</div>
      <div className="mt-1 text-[12px]" style={{ color: "var(--ink-soft)" }}>
        {label}
      </div>
    </div>
  );
}
