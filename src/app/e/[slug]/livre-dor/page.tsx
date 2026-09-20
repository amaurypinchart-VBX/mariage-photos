import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import BrandBar from "@/components/BrandBar";
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

  return (
    <>
      <BrandBar backHref={`/e/${event.slug}`} />
      <div className="flex flex-1 flex-col px-[22px] pb-6 pt-1.5">
        <div className="mb-1 mt-1.5">
          <div className="eyebrow mb-1.5">Livre d&apos;or</div>
          <h1 className="display text-[28px] leading-[1.06]">{event.couple_names}</h1>
        </div>
        <GuestbookApp slug={event.slug} eventId={event.id} albumToken={searchParams.album} />
      </div>
    </>
  );
}
