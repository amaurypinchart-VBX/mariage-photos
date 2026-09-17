import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import { createAdminClient } from "@/lib/supabase/admin";
import BrandBar from "@/components/BrandBar";
import GuestAlbum, { type AlbumItem } from "@/components/guest/GuestAlbum";
import type { GuestUpload, ShareLink } from "@/lib/types";

export const dynamic = "force-dynamic";

// Page privée d'un lien de partage : jamais indexée.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AlbumPage({
  params,
}: {
  params: { slug: string; token: string };
}) {
  const event = await getEventBySlug(params.slug);
  if (!event) notFound();

  const admin = createAdminClient();

  const { data: linkData } = await admin
    .from("share_links")
    .select("id, event_id, label, token, is_active, created_at")
    .eq("event_id", event.id)
    .eq("token", params.token)
    .eq("is_active", true)
    .maybeSingle();
  const link = linkData as ShareLink | null;
  if (!link) notFound();

  const { data: uploadsData } = await admin
    .from("guest_uploads")
    .select(
      "id, event_id, guest_name, storage_path, kind, mime_type, size_bytes, challenge_id, share_link_id, visible_to_all, created_at"
    )
    .eq("event_id", event.id)
    .or(`visible_to_all.eq.true,share_link_id.eq.${link.id}`)
    .order("created_at", { ascending: false });
  const uploads = (uploadsData as GuestUpload[]) ?? [];

  const urlByPath: Record<string, string> = {};
  if (uploads.length > 0) {
    const { data: signed } = await admin.storage
      .from("wedding-media")
      .createSignedUrls(
        uploads.map((u) => u.storage_path),
        60 * 60 * 2
      );
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && s.path) urlByPath[s.path] = s.signedUrl;
    });
  }

  const items: AlbumItem[] = uploads
    .filter((u) => urlByPath[u.storage_path])
    .map((u) => ({
      id: u.id,
      url: urlByPath[u.storage_path],
      kind: u.kind,
      filename: `${(u.guest_name || "photo").replace(/[^a-zA-Z0-9-]/g, "_")}-${u.id.slice(0, 8)}.${
        u.kind === "video" ? "mp4" : "jpg"
      }`,
    }));

  return (
    <>
      <BrandBar backHref={`/e/${event.slug}`} />
      <div className="flex flex-1 flex-col px-[22px] pb-6 pt-1.5">
        <div className="mb-4 mt-1.5">
          <div className="eyebrow mb-1.5">Photos partagées avec : {link.label}</div>
          <h1 className="display text-[28px] leading-[1.06]">{event.couple_names}</h1>
        </div>
        <GuestAlbum items={items} />
      </div>
    </>
  );
}
