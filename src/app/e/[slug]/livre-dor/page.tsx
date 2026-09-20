import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { getGuestbookCover } from "@/lib/guestbookAdmin";
import BrandBar from "@/components/BrandBar";
import GuestbookCover from "@/components/guestbook/GuestbookCover";
import GuestbookApp from "@/components/guestbook/GuestbookApp";

export const dynamic = "force-dynamic";

export default async function LivreDorPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { album?: string };
}) {
  const event = await getEventBySlug(params.slug);
  if (!event || !event.guestbook_active) notFound();

  const supabase = createClient();
  const cover = await getGuestbookCover(supabase, event);

  return (
    <>
      <BrandBar backHref={`/e/${event.slug}`} />
      <div className="flex flex-1 flex-col px-[22px] pb-6 pt-1.5">
        <div className="mb-4 mt-1.5">
          <GuestbookCover
            coupleNames={event.couple_names}
            title={cover.title}
            message={cover.message}
            stickers={cover.stickers}
            photos={cover.photos}
          />
        </div>
        <GuestbookApp slug={event.slug} eventId={event.id} albumToken={searchParams.album} />
      </div>
    </>
  );
}
