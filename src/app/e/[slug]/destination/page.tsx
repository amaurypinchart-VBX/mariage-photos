import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import BrandBar from "@/components/BrandBar";
import DonationNote from "@/components/guestbook/DonationNote";
import DestinationVoteApp from "@/components/guestbook/DestinationVoteApp";

export const dynamic = "force-dynamic";

export default async function DestinationPage({
  params,
}: {
  params: { slug: string };
}) {
  const event = await getEventBySlug(params.slug);
  // Le vote destination utilise la même identité invité (prénom + code) que
  // le livre d'or, gérée par les mêmes Server Actions : il dépend donc du
  // même interrupteur.
  if (!event || !event.guestbook_active) notFound();

  return (
    <>
      <BrandBar backHref={`/e/${event.slug}`} />
      <div className="flex flex-1 flex-col px-[22px] pb-6 pt-1.5">
        <div className="mb-5 mt-1.5">
          <div className="eyebrow mb-1.5" style={{ color: "var(--champ)" }}>
            Lune de miel
          </div>
          <h1 className="display text-[28px] leading-[1.06]">Où devrait-on partir ?</h1>
          <p className="mt-3 text-[14.5px]" style={{ color: "var(--ink-soft)" }}>
            Un immense merci à chacun d&apos;entre vous pour votre présence : ce
            mariage restera pour nous un moment inoubliable. 💛
          </p>
        </div>

        <DonationNote />

        <DestinationVoteApp slug={event.slug} eventId={event.id} />
      </div>
    </>
  );
}
