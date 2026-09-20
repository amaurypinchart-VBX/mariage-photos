import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGuestbookPages } from "@/lib/guestbookAdmin";
import type { WeddingEvent } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
import GuestbookBookViewer from "@/components/admin/GuestbookBookViewer";

export const dynamic = "force-dynamic";

export default async function AdminGuestbookPage({
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
      "id, slug, couple_names, event_date, place, welcome_message, color_primary, color_accent, game_active, gallery_public, guestbook_active, is_active, created_at"
    )
    .eq("slug", params.slug)
    .maybeSingle();
  if (!eventData) notFound();
  const event = eventData as WeddingEvent;

  const pages = await getGuestbookPages(supabase, event.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/admin/${event.slug}`} className="text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
          ‹ Retour
        </Link>
        <ThemeToggle />
      </div>

      <div className="eyebrow mb-1.5">Livre d&apos;or</div>
      <h1 className="display text-[30px] leading-tight">{event.couple_names}</h1>

      <div className="mt-6">
        <GuestbookBookViewer pages={pages} />
      </div>
    </div>
  );
}
