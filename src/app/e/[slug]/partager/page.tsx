import Link from "next/link";
import { getEventBySlug } from "@/lib/events";
import { notFound } from "next/navigation";
import BrandBar from "@/components/BrandBar";
import Uploader from "@/components/guest/Uploader";
import GuestGreeting from "@/components/guest/GuestGreeting";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: { slug: string };
}) {
  const event = await getEventBySlug(params.slug);
  if (!event) notFound();

  return (
    <>
      <BrandBar backHref={`/e/${event.slug}`} />
      <div className="flex flex-1 flex-col px-[22px] pb-6 pt-1.5">
        <div className="mb-1 mt-1.5">
          <GuestGreeting slug={event.slug} />
          <h1 className="display text-[30px] leading-[1.06]">Tes photos</h1>
          <p className="mt-2 text-[14px]" style={{ color: "var(--ink-soft)" }}>
            Ajoute autant de photos et de vidéos que tu veux. Elles arrivent
            directement dans l&apos;album privé des mariés.
          </p>
        </div>

        {event.guestbook_active && (
          <Link
            href={`/e/${event.slug}/livre-dor`}
            className="card mb-4 flex items-center gap-3 p-4"
            style={{ background: "var(--sage-tint)" }}
          >
            <span className="text-[22px]">💌</span>
            <span>
              <span className="block text-[14.5px] font-semibold">Signer le livre d&apos;or</span>
              <span className="block text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                Laisse un petit mot, une photo, une voix pour les mariés.
              </span>
            </span>
          </Link>
        )}

        {event.guestbook_active && (
          <Link
            href={`/e/${event.slug}/destination`}
            className="card mb-4 flex items-center gap-3 p-4"
            style={{ background: "var(--champ-tint)" }}
          >
            <span className="text-[22px]">✈️</span>
            <span>
              <span className="block text-[14.5px] font-semibold">Voter pour la lune de miel</span>
              <span className="block text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                Propose une destination ou vote pour celle des autres.
              </span>
            </span>
          </Link>
        )}

        <Uploader eventId={event.id} slug={event.slug} />
      </div>
    </>
  );
}
