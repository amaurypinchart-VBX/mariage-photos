import { getChallenges, getEventBySlug } from "@/lib/events";
import { notFound } from "next/navigation";
import Link from "next/link";
import BrandBar from "@/components/BrandBar";
import Roulette from "@/components/guest/Roulette";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: { slug: string };
}) {
  const event = await getEventBySlug(params.slug);
  if (!event) notFound();

  const challenges = event.game_active ? await getChallenges(event.id) : [];

  return (
    <>
      <BrandBar backHref={`/e/${event.slug}`} />
      <div className="flex flex-1 flex-col px-[22px] pb-6 pt-1.5">
        <div className="mb-1 mt-1.5">
          <div className="eyebrow mb-[9px]">Le jeu du mariage</div>
          <h1 className="display text-[30px] leading-[1.06]">La roulette photo</h1>
          <p className="mt-2 text-[14px]" style={{ color: "var(--ink-soft)" }}>
            Tourne la roue, décroche un défi, prends la photo. À toi de
            retrouver les bonnes personnes&nbsp;!
          </p>
        </div>

        {!event.game_active || challenges.length === 0 ? (
          <div className="mt-8 flex flex-1 flex-col items-center justify-center text-center">
            <div
              className="mb-4 grid h-16 w-16 place-items-center rounded-full text-[28px]"
              style={{ background: "var(--champ-tint)", color: "var(--champ)" }}
            >
              ⏳
            </div>
            <p className="display text-[22px]">Le jeu n&apos;est pas encore lancé</p>
            <p className="mt-2 max-w-[280px] text-[14px]" style={{ color: "var(--ink-soft)" }}>
              Les mariés l&apos;activeront pendant la soirée. En attendant, tu
              peux déjà partager tes photos&nbsp;!
            </p>
            <Link href={`/e/${event.slug}/partager`} className="btn btn-primary mt-6">
              ✦ Partager mes photos
            </Link>
          </div>
        ) : (
          <Roulette eventId={event.id} slug={event.slug} challenges={challenges} />
        )}
      </div>
    </>
  );
}
